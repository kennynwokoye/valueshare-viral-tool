import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { detectClickSource } from '@/lib/utils'
import { detectFraud } from '@/lib/fraud'
import {
  sendRewardUnlockedEmail,
  sendCreatorRewardNotification,
  sendFraudAlertEmail,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://valueshare.co'

interface Props {
  params: Promise<{ code: string }>
}

export async function GET(request: Request, { params }: Props) {
  const { code } = await params
  const supabase = createAdminClient()

  // ── 1. Extract request metadata ──────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  const userAgent = request.headers.get('user-agent')
  const referrer = request.headers.get('referer')
  const clickSource = detectClickSource(referrer)

  // ── 2. Look up participant + campaign ────────────────
  const { data: participant, error: lookupError } = await supabase
    .from('participants')
    .select(
      'id, campaign_id, email, user_id, campaigns!inner(id, status, destination_url, slug, name, creator_id)'
    )
    .eq('referral_code', code.toUpperCase())
    .single()

  if (lookupError || !participant) {
    return NextResponse.redirect(new URL('/', APP_URL), 302)
  }

  const campaign = participant.campaigns as unknown as {
    id: string
    status: string
    destination_url: string
    slug: string
    name: string
    creator_id: string
  }

  // Campaign not active → show landing page (which displays inactive message)
  if (campaign.status !== 'active') {
    return NextResponse.redirect(new URL(`/c/${campaign.slug}`, APP_URL), 302)
  }

  // ── 3. Run fraud detection ───────────────────────────
  const fraud = await detectFraud({
    supabase,
    participantId: participant.id,
    campaignId: campaign.id,
    ip,
    userAgent,
  })

  // ── 4. Insert click record ───────────────────────────
  // DB triggers handle: click_count increment, reward unlock check
  const { error: insertError } = await supabase
    .from('referral_clicks')
    .insert({
      participant_id: participant.id,
      campaign_id: campaign.id,
      ip_address: ip,
      user_agent: userAgent,
      referrer,
      fraud_score: fraud.score,
      is_valid: fraud.is_valid,
      fraud_reasons: fraud.reasons,
      click_source: clickSource,
    })

  if (insertError) {
    console.error('[track] insert error:', insertError.message)
    // Fail open: redirect user anyway
    return NextResponse.redirect(campaign.destination_url, 302)
  }

  // ── 4a. Fraud spike alert ────────────────────────────
  if (!fraud.is_valid) {
    try {
      const { count: recentFraud } = await supabase
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('is_valid', false)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())

      if ((recentFraud ?? 0) >= 5 && (recentFraud ?? 0) % 5 === 0) {
        await supabase.from('notifications').insert({
          user_id: campaign.creator_id,
          campaign_id: campaign.id,
          type: 'fraud_spike',
          title: 'Fraud spike detected',
          message: `5 suspicious clicks detected on "${campaign.name}" in the last hour`,
          data: { count: recentFraud, campaign_name: campaign.name },
        })
        const { data: creatorUser } = await supabase
          .from('users')
          .select('email')
          .eq('id', campaign.creator_id)
          .single()
        if (creatorUser) {
          sendFraudAlertEmail({
            to: creatorUser.email,
            campaignTitle: campaign.name,
            fraudCount: 5,
          }).catch(() => { })
        }
      }
    } catch (err) {
      console.error('[track] fraud spike check error:', err)
    }
  }

  // ── 5. Send reward emails for any new unlocks ────────
  if (fraud.is_valid) {
    try {
      const { data: pendingUnlocks } = await supabase
        .from('reward_unlocks')
        .select(
          'id, access_token, tier_id, reward_tiers!inner(reward_label, label, reward_type)'
        )
        .eq('participant_id', participant.id)
        .eq('delivery_email_sent', false)

      if (pendingUnlocks && pendingUnlocks.length > 0) {
        // Get creator email once
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

          // Notify participant
          await sendRewardUnlockedEmail({
            to: participant.email,
            rewardLabel: tier.reward_label,
            tierLabel: tier.label,
            campaignTitle: campaign.name,
            accessToken: unlock.access_token,
            rewardType: tier.reward_type,
          })

          // Notify creator
          if (creator) {
            await sendCreatorRewardNotification({
              to: creator.email,
              participantEmail: participant.email,
              rewardLabel: tier.reward_label,
              campaignTitle: campaign.name,
            })
          }

          // Mark as delivered
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
    } catch (err) {
      console.error('[track] email error:', err)
      // Don't block redirect on email failure
    }
  }

  // ── 6. Redirect to destination ───────────────────────
  function isSafeRedirectUrl(url: string): boolean {
    try {
      const u = new URL(url)
      return u.protocol === 'https:' || u.protocol === 'http:'
    } catch { return false }
  }

  let baseTarget = isSafeRedirectUrl(campaign.destination_url)
    ? campaign.destination_url
    : `${APP_URL}/c/${campaign.slug}`

  // Append vs_ref so the ValueShare pixel can read it on the destination page
  try {
    const dest = new URL(baseTarget)
    dest.searchParams.set('vs_ref', code.toUpperCase())
    baseTarget = dest.toString()
  } catch { /* keep baseTarget as-is if URL parse fails */ }

  // Set attribution cookie for the hosted thank-you page flow.
  // Browsers process Set-Cookie on 302 responses before following the redirect.
  const response = NextResponse.redirect(baseTarget, 302)
  response.cookies.set('vs_pending_ref', code.toUpperCase(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
