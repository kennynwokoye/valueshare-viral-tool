import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CreatorParticipant } from '@/types'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run all queries in parallel
    const [dashboardResult, campaignsResult, participantsResult] = await Promise.all([
      // 1. Aggregate dashboard data via SECURITY DEFINER RPC
      supabase.rpc('get_creator_dashboard', { p_creator_id: user.id }),

      // 2. All campaigns with tiers and widget (for Campaigns tab)
      supabase
        .from('campaigns')
        .select('*, reward_tiers(*), embed_widgets(*)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }),

      // 3. Top 50 participants across all creator campaigns (for Participants tab)
      supabase
        .from('participants')
        .select(`
          id,
          email,
          click_count,
          joined_at,
          campaign_id,
          campaigns!inner(name, creator_id),
          reward_unlocks(id)
        `)
        .eq('campaigns.creator_id', user.id)
        .order('click_count', { ascending: false })
        .limit(50),
    ])

    if (dashboardResult.error) {
      console.error('Creator dashboard RPC error:', dashboardResult.error)
      return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
    }

    // Shape participants into CreatorParticipant[]
    const participants: CreatorParticipant[] = (participantsResult.data ?? []).map((p) => {
      // Supabase infers the join as array; cast via unknown to our shape
      const row = (p as unknown) as {
        id: string
        email: string
        click_count: number
        joined_at: string
        campaign_id: string
        campaigns: { name: string } | { name: string }[] | null
        reward_unlocks: { id: string }[] | null
      }
      const campRaw = row.campaigns
      const campName = Array.isArray(campRaw)
        ? (campRaw[0]?.name ?? '')
        : (campRaw?.name ?? '')
      return {
        id: row.id,
        email: row.email,
        click_count: row.click_count,
        joined_at: row.joined_at,
        campaign_id: row.campaign_id,
        campaign_name: campName,
        has_reward: Array.isArray(row.reward_unlocks) && row.reward_unlocks.length > 0,
      }
    })

    const dashData = dashboardResult.data as Record<string, unknown>

    return NextResponse.json({
      ...dashData,
      participants,
      campaigns: campaignsResult.data ?? [],
    })
  } catch (err) {
    console.error('Creator dashboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
