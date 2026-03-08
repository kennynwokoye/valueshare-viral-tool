import { createClient } from '@supabase/supabase-js'
import { sendWeeklyDigestEmail } from '../../src/lib/email'

export default async function handler() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const startDate = new Date(Date.now() - 7 * 24 * 3600 * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
  const endDate = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  // Get all creators who have at least one campaign
  const { data: creatorProfiles } = await supabase
    .from('creator_profiles')
    .select('user_id, name')
    .limit(500)

  if (!creatorProfiles || creatorProfiles.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Fetch creator emails in bulk
  const { data: creatorUsers } = await supabase
    .from('users')
    .select('id, email')
    .in('id', creatorProfiles.map((c) => c.user_id))

  const emailMap = new Map((creatorUsers ?? []).map((u) => [u.id, u.email]))

  let sent = 0

  for (const creator of creatorProfiles) {
    const creatorEmail = emailMap.get(creator.user_id)
    if (!creatorEmail) continue

    // Get this creator's campaigns
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, name, total_clicks, total_participants')
      .eq('creator_id', creator.user_id)

    if (!camps || camps.length === 0) continue

    const campIds = camps.map((c) => c.id)

    // Fetch 7-day stats in parallel
    const [clicksRes, participantsRes, rewardsRes, fraudRes] = await Promise.all([
      supabase
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campIds)
        .eq('is_valid', true)
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campIds)
        .gte('joined_at', sevenDaysAgo),
      supabase
        .from('reward_unlocks')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campIds)
        .gte('unlocked_at', sevenDaysAgo),
      supabase
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campIds)
        .eq('is_valid', false)
        .gte('created_at', sevenDaysAgo),
    ])

    // Top campaign by all-time total_participants
    const topCamp = [...camps].sort((a, b) => b.total_participants - a.total_participants)[0]

    // Top participant by click_count across all campaigns this week
    const { data: topPart } = await supabase
      .from('participants')
      .select('email, click_count')
      .in('campaign_id', campIds)
      .order('click_count', { ascending: false })
      .limit(1)
      .maybeSingle()

    await sendWeeklyDigestEmail({
      to: creatorEmail,
      creatorName: creator.name || 'Creator',
      stats: {
        clicks7: clicksRes.count ?? 0,
        newParticipants: participantsRes.count ?? 0,
        rewardsDelivered: rewardsRes.count ?? 0,
        fraudBlocked: fraudRes.count ?? 0,
        topCampaign: topCamp ? { name: topCamp.name, clicks: topCamp.total_clicks } : undefined,
        topParticipant: topPart ? { email: topPart.email, clicks: topPart.click_count } : undefined,
        startDate,
        endDate,
      },
    }).catch(() => {})

    sent++
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
}

export const config = {
  schedule: '0 9 * * 1',
}
