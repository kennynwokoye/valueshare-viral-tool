'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReferralClick, RewardTier, RewardUnlock } from '@/types'

// ── Types ────────────────────────────────────────────────

export interface RealtimeRewardUnlock extends RewardUnlock {
  tier: RewardTier
}

export interface UseParticipantRealtimeResult {
  // Click tracking (replaces useRealtimeClicks)
  realtimeClicks: ReferralClick[]
  realtimeClickCount: number | null

  // Conversion tracking (for non-click KPI types)
  realtimeConversionCount: number | null

  // Reward unlock celebration
  newRewardUnlock: RealtimeRewardUnlock | null
  dismissRewardUnlock: () => void

  // Leaderboard staleness (debounced)
  leaderboardStale: boolean
  clearLeaderboardStale: () => void

  // Campaign status change
  campaignStatusChange: string | null
  clearCampaignStatus: () => void
}

// ── Hook ─────────────────────────────────────────────────

export function useParticipantRealtime(
  participantId: string | null,
  campaignId: string | null,
  initialClickCount: number,
  rewardTiers: RewardTier[],
): UseParticipantRealtimeResult {
  // Click tracking state (same as old useRealtimeClicks)
  const [realtimeClicks, setRealtimeClicks] = useState<ReferralClick[]>([])
  const [realtimeClickCount, setRealtimeClickCount] = useState<number | null>(null)
  const [realtimeConversionCount, setRealtimeConversionCount] = useState<number | null>(null)

  // Reward unlock celebration
  const [newRewardUnlock, setNewRewardUnlock] = useState<RealtimeRewardUnlock | null>(null)

  // Leaderboard staleness
  const [leaderboardStale, setLeaderboardStale] = useState(false)
  const leaderboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Campaign status change
  const [campaignStatusChange, setCampaignStatusChange] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const tiersRef = useRef(rewardTiers)
  tiersRef.current = rewardTiers

  useEffect(() => {
    if (!participantId || !campaignId) return

    // Reset on campaign change
    setRealtimeClicks([])
    setRealtimeClickCount(null)
    setRealtimeConversionCount(null)
    setNewRewardUnlock(null)
    setLeaderboardStale(false)
    setCampaignStatusChange(null)

    const supabase = createClient()

    const channel = supabase
      .channel(`participant-rt-${participantId}-${campaignId}`)

      // 1. Own new clicks
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_clicks',
          filter: `participant_id=eq.${participantId}`,
        },
        (payload) => {
          const newClick = payload.new as ReferralClick
          if (newClick.campaign_id === campaignId) {
            setRealtimeClicks((prev) => [newClick, ...prev])
          }
        }
      )

      // 2. Own click_count sync
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participantId}`,
        },
        (payload) => {
          const updated = payload.new as { click_count: number; conversion_count: number }
          setRealtimeClickCount(updated.click_count)
          setRealtimeConversionCount(updated.conversion_count)
        }
      )

      // 3. Reward unlock celebration
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reward_unlocks',
          filter: `participant_id=eq.${participantId}`,
        },
        (payload) => {
          const unlock = payload.new as RewardUnlock
          if (unlock.campaign_id !== campaignId) return
          // Match the tier from the locally-available rewardTiers
          const tier = tiersRef.current.find((t) => t.id === unlock.tier_id)
          if (tier) {
            setNewRewardUnlock({ ...unlock, tier })
          }
        }
      )

      // 4 & 5. Campaign global update (clicks incrementing & status changes)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string }
          if (updated.status === 'paused' || updated.status === 'ended') {
            setCampaignStatusChange(updated.status)
          }

          // Debounce: wait 3s after last click before marking leaderboard stale
          if (leaderboardTimerRef.current) clearTimeout(leaderboardTimerRef.current)
          leaderboardTimerRef.current = setTimeout(() => {
            setLeaderboardStale(true)
          }, 3000)
        }
      )

      .subscribe()

    channelRef.current = channel

    return () => {
      if (leaderboardTimerRef.current) clearTimeout(leaderboardTimerRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [participantId, campaignId])

  const dismissRewardUnlock = useCallback(() => setNewRewardUnlock(null), [])
  const clearLeaderboardStale = useCallback(() => setLeaderboardStale(false), [])
  const clearCampaignStatus = useCallback(() => setCampaignStatusChange(null), [])

  return {
    realtimeClicks,
    realtimeClickCount: realtimeClickCount ?? initialClickCount,
    realtimeConversionCount,
    newRewardUnlock,
    dismissRewardUnlock,
    leaderboardStale,
    clearLeaderboardStale,
    campaignStatusChange,
    clearCampaignStatus,
  }
}
