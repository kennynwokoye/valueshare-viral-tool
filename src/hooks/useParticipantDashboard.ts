'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ParticipantDashboardData,
  Participant,
  Campaign,
  RewardTier,
  RewardUnlock,
  CampaignPromoAsset,
  ReferralClick,
  LeaderboardEntry,
  Notification,
} from '@/types'

interface UseParticipantDashboardResult {
  data: ParticipantDashboardData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useParticipantDashboard(
  participantId: string | null,
  campaignId: string | null
): UseParticipantDashboardResult {
  const [data, setData] = useState<ParticipantDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!participantId || !campaignId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Run all 6 queries in parallel
      const [
        participantResult,
        tiersResult,
        unlocksResult,
        assetsResult,
        notificationsResult,
        apiResult,
      ] = await Promise.all([
        // 1. Participant + campaign
        supabase
          .from('participants')
          .select('*, campaigns(*)')
          .eq('id', participantId)
          .single(),

        // 2. Reward tiers
        supabase
          .from('reward_tiers')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('tier_order', { ascending: true }),

        // 3. Reward unlocks with tier info
        supabase
          .from('reward_unlocks')
          .select('*, reward_tiers(*)')
          .eq('participant_id', participantId)
          .eq('campaign_id', campaignId),

        // 4. Promo assets
        supabase
          .from('campaign_promo_assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false }),

        // 5. Notifications
        supabase
          .from('notifications')
          .select('*')
          .eq('participant_id', participantId)
          .order('created_at', { ascending: false })
          .limit(20),

        // 6. Leaderboard + recent clicks (API route for RLS bypass)
        fetch(`/api/dashboard/participant?campaignId=${campaignId}&participantId=${participantId}`)
          .then((r) => r.json()),
      ])

      if (participantResult.error) {
        throw new Error(participantResult.error.message)
      }

      const participantRow = participantResult.data as Participant & { campaigns: Campaign }
      const campaign = participantRow.campaigns
      const participant: Participant = {
        id: participantRow.id,
        user_id: participantRow.user_id,
        campaign_id: participantRow.campaign_id,
        referral_code: participantRow.referral_code,
        email: participantRow.email,
        otp_code: participantRow.otp_code,
        otp_expires_at: participantRow.otp_expires_at,
        click_count: participantRow.click_count,
        joined_at: participantRow.joined_at,
        last_active_at: participantRow.last_active_at,
      }

      // Map unlocks with their tier data
      const unlockedRewards = (unlocksResult.data ?? []).map((u: RewardUnlock & { reward_tiers: RewardTier }) => ({
        ...u,
        tier: u.reward_tiers,
      }))

      setData({
        participant,
        campaign,
        rewardTiers: (tiersResult.data ?? []) as RewardTier[],
        unlockedRewards,
        promoAssets: (assetsResult.data ?? []) as CampaignPromoAsset[],
        recentClicks: (apiResult.recentClicks ?? []) as ReferralClick[],
        leaderboard: (apiResult.leaderboard ?? []) as LeaderboardEntry[],
        notifications: (notificationsResult.data ?? []) as Notification[],
        myRank: apiResult.myRank ?? null,
        totalParticipants: apiResult.totalParticipants ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [participantId, campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
