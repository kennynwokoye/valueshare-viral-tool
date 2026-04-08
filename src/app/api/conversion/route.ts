import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendRewardUnlockedEmail,
  sendCreatorRewardNotification,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 1x1 transparent GIF for pixel beacon responses
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-ValueShare-Secret',
}

// Preflight for cross-origin POST (webhook from external servers)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ── GET /api/conversion?ref={code}&event={type}
// Pixel beacon — called by pixel.js from external thank-you pages
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ref = url.searchParams.get('ref')?.toUpperCase()
  const eventType = url.searchParams.get('event') || 'conversion'

  if (!ref) {
    return pixelResponse()
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  const userAgent = request.headers.get('user-agent')

  await recordConversion({ ref, eventType, ip, userAgent: userAgent ?? null })

  return pixelResponse()
}

// ── POST /api/conversion
// Server-to-server webhook — called from creator's backend
// Body: { ref_code: string, event?: string, secret?: string, metadata?: object }
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const ref = (typeof body.ref_code === 'string' ? body.ref_code : '').toUpperCase()
  const eventType = typeof body.event === 'string' ? body.event : 'conversion'
  const secret = typeof body.secret === 'string' ? body.secret : null
  const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}

  if (!ref) {
    return NextResponse.json(
      { error: 'ref_code is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  const userAgent = request.headers.get('user-agent')

  const supabase = createAdminClient()

  // Look up participant + campaign to validate secret if provided
  const { data: participant } = await supabase
    .from('participants')
    .select('id, campaign_id, campaigns!inner(status, webhook_secret)')
    .eq('referral_code', ref)
    .single()

  if (!participant) {
    return NextResponse.json(
      { error: 'Invalid ref_code' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const campaign = participant.campaigns as unknown as {
    status: string
    webhook_secret: string | null
  }

  if (campaign.status !== 'active') {
    return NextResponse.json(
      { error: 'Campaign is not active' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // Validate webhook secret if one is set on the campaign
  if (campaign.webhook_secret) {
    const headerSecret = request.headers.get('X-ValueShare-Secret') || request.headers.get('x-valueshare-secret')
    const providedSecret = secret || headerSecret
    if (providedSecret !== campaign.webhook_secret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401, headers: CORS_HEADERS }
      )
    }
  }

  const inserted = await recordConversion({
    ref,
    eventType,
    ip,
    userAgent: userAgent ?? null,
    metadata: metadata as Record<string, unknown>,
    participantId: participant.id,
    campaignId: participant.campaign_id,
  })

  if (!inserted) {
    return NextResponse.json(
      { error: 'Failed to record conversion' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(
    { ok: true, message: 'Conversion recorded' },
    { status: 200, headers: CORS_HEADERS }
  )
}

// ── Shared helper ─────────────────────────────────────────────────────────────

interface ConversionPayload {
  ref: string
  eventType: string
  ip: string
  userAgent: string | null
  metadata?: Record<string, unknown>
  // Pre-resolved (optional — skips lookup for GET pixel where we look up inside)
  participantId?: string
  campaignId?: string
}

async function recordConversion(payload: ConversionPayload): Promise<boolean> {
  const supabase = createAdminClient()

  let participantId = payload.participantId
  let campaignId = payload.campaignId

  if (!participantId || !campaignId) {
    const { data: participant } = await supabase
      .from('participants')
      .select('id, campaign_id, campaigns!inner(status)')
      .eq('referral_code', payload.ref)
      .single()

    if (!participant) return false

    const camp = participant.campaigns as unknown as { status: string }
    if (camp.status !== 'active') return false

    participantId = participant.id
    campaignId = participant.campaign_id
  }

  // Server-side dedup: same ref_code + IP in last 24h → skip insert
  const { count: existing } = await supabase
    .from('conversions')
    .select('id', { count: 'exact', head: true })
    .eq('ref_code', payload.ref)
    .eq('ip_address', payload.ip)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())

  if ((existing ?? 0) > 0) return true // already recorded

  const { error } = await supabase.from('conversions').insert({
    participant_id: participantId,
    campaign_id: campaignId,
    ref_code: payload.ref,
    event_type: payload.eventType,
    metadata: payload.metadata ?? {},
    ip_address: payload.ip,
    user_agent: payload.userAgent,
  })

  if (error) return false

  // Send reward emails for any newly unlocked tiers (fire-and-forget)
  if (participantId && campaignId) {
    dispatchRewardEmails(supabase, participantId, campaignId).catch(() => {})
  }

  return true
}

async function dispatchRewardEmails(
  supabase: ReturnType<typeof createAdminClient>,
  participantId: string,
  campaignId: string,
) {
  const { data: pendingUnlocks } = await supabase
    .from('reward_unlocks')
    .select(
      'id, access_token, tier_id, reward_tiers!inner(reward_label, label, reward_type)'
    )
    .eq('participant_id', participantId)
    .eq('delivery_email_sent', false)

  if (!pendingUnlocks || pendingUnlocks.length === 0) return

  // Get participant email and campaign info
  const [{ data: participant }, { data: campaign }] = await Promise.all([
    supabase.from('participants').select('email').eq('id', participantId).single(),
    supabase.from('campaigns').select('name, creator_id').eq('id', campaignId).single(),
  ])

  if (!participant || !campaign) return

  const { data: creator } = await supabase
    .from('users')
    .select('email')
    .eq('id', campaign.creator_id)
    .single()

  const emailPromises = pendingUnlocks.map(async (unlock) => {
    const tier = unlock.reward_tiers as unknown as {
      reward_label: string
      label: string
      reward_type: string
    }

    await sendRewardUnlockedEmail({
      to: participant.email,
      rewardLabel: tier.reward_label,
      tierLabel: tier.label,
      campaignTitle: campaign.name,
      accessToken: unlock.access_token,
      rewardType: tier.reward_type,
    })

    if (creator) {
      await sendCreatorRewardNotification({
        to: creator.email,
        participantEmail: participant.email,
        rewardLabel: tier.reward_label,
        campaignTitle: campaign.name,
      })
    }

    await supabase
      .from('reward_unlocks')
      .update({
        delivery_email_sent: true,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', unlock.id)
  })

  await Promise.allSettled(emailPromises)
}

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
