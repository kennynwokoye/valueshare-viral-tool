import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const participantId = searchParams.get('participantId')

    if (!campaignId || !participantId) {
      return NextResponse.json({ error: 'Missing campaignId or participantId' }, { status: 400 })
    }

    // Verify the participant belongs to this user
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', participantId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Run leaderboard RPC and recent clicks in parallel
    const [leaderboardResult, clicksResult] = await Promise.all([
      supabase.rpc('get_campaign_leaderboard', {
        p_campaign_id: campaignId,
        p_participant_id: participantId,
      }),
      supabase
        .from('referral_clicks')
        .select('*')
        .eq('participant_id', participantId)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const leaderboardData = leaderboardResult.data as {
      leaderboard: unknown[]
      total_participants: number
      my_rank: number | null
    } | null

    return NextResponse.json({
      leaderboard: leaderboardData?.leaderboard ?? [],
      totalParticipants: leaderboardData?.total_participants ?? 0,
      myRank: leaderboardData?.my_rank ?? null,
      recentClicks: clicksResult.data ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
