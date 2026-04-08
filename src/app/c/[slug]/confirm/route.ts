import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendRewardUnlockedEmail,
  sendCreatorRewardNotification,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /c/[slug]/confirm
 *
 * Route handler that records a conversion from the hosted thank-you page flow.
 * 1. Reads vs_pending_ref cookie (set by /api/track/[code])
 * 2. Records the conversion (with server-side dedup)
 * 3. Sends reward emails for any newly unlocked tiers
 * 4. Clears the cookie
 * 5. Redirects to /c/[slug]/thanks (display-only page)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://valueshare.co'
  const thanksUrl = `${appUrl}/c/${slug}/thanks`

  // Look up campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, name, creator_id')
    .eq('slug', slug)
    .single()

  if (!campaign) {
    return NextResponse.redirect(thanksUrl, 302)
  }

  const cookieStore = await cookies()
  const pendingRef = cookieStore.get('vs_pending_ref')?.value

  if (pendingRef && campaign.status === 'active') {
    // Look up the referring participant
    const { data: referrer } = await supabase
      .from('participants')
      .select('id, email')
      .eq('referral_code', pendingRef)
      .eq('campaign_id', campaign.id)
      .single()

    if (referrer) {
      const hdrs = await headers()
      const ip =
        hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        hdrs.get('x-real-ip') ||
        '0.0.0.0'

      // Server-side dedup: same ref_code + IP in last 24h
      const { count } = await supabase
        .from('conversions')
        .select('id', { count: 'exact', head: true })
        .eq('ref_code', pendingRef)
        .eq('ip_address', ip)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())

      if ((count ?? 0) === 0) {
        // Record conversion — DB trigger increments conversion_count + checks rewards
        await supabase.from('conversions').insert({
          participant_id: referrer.id,
          campaign_id: campaign.id,
          ref_code: pendingRef,
          event_type: 'registration',
          metadata: { source: 'thankyou_redirect' },
          ip_address: ip,
          user_agent: hdrs.get('user-agent'),
        })

        // Send reward emails for any newly unlocked tiers
        try {
          const { data: pendingUnlocks } = await supabase
            .from('reward_unlocks')
            .select(
              'id, access_token, tier_id, reward_tiers!inner(reward_label, label, reward_type)'
            )
            .eq('participant_id', referrer.id)
            .eq('delivery_email_sent', false)

          if (pendingUnlocks && pendingUnlocks.length > 0) {
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
                to: referrer.email,
                rewardLabel: tier.reward_label,
                tierLabel: tier.label,
                campaignTitle: campaign.name,
                accessToken: unlock.access_token,
                rewardType: tier.reward_type,
              })

              if (creator) {
                await sendCreatorRewardNotification({
                  to: creator.email,
                  participantEmail: referrer.email,
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
        } catch (err) {
          console.error('[confirm] email error:', err)
        }
      }
    }
  }

  // Clear cookie and redirect to the display-only thanks page
  const response = NextResponse.redirect(thanksUrl, 302)
  response.cookies.set('vs_pending_ref', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0, // expires immediately
    path: '/',
  })
  return response
}
