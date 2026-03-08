'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CreatorDashboardData, CampaignWithTiers, CreatorActivityItem } from '@/types'

interface UseCreatorDashboardResult {
  data: CreatorDashboardData | null
  campaigns: CampaignWithTiers[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCreatorDashboard(): UseCreatorDashboardResult {
  const [data, setData] = useState<CreatorDashboardData | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignWithTiers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/dashboard/creator')
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Failed to load' }))
        throw new Error(msg ?? 'Failed to load dashboard data')
      }

      const json = await res.json()

      setCampaigns((json.campaigns ?? []) as CampaignWithTiers[])
      setData({
        aggregate: json.aggregate ?? {
          total_clicks: 0,
          total_participants: 0,
          active_campaigns: 0,
          rewards_delivered: 0,
          fraud_blocked: 0,
          viral_coefficient: 0,
        },
        top_campaign: json.top_campaign ?? null,
        clicks_per_day_7: json.clicks_per_day_7 ?? [],
        clicks_per_day_30: json.clicks_per_day_30 ?? [],
        click_sources: json.click_sources ?? [],
        geo_distribution: json.geo_distribution ?? [],
        top_participants: json.top_participants ?? [],
        recent_activity: json.recent_activity ?? [],
        fraud_summary: json.fraud_summary ?? { total: 0, duplicate_ip: 0, vpn_proxy: 0, velocity: 0 },
        fraud_flags: json.fraud_flags ?? [],
        reward_unlocks: json.reward_unlocks ?? [],
        participants: json.participants ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time subscription: prepend new join/click activity to the feed
  useEffect(() => {
    if (!data) return

    const campaignIds = campaigns.map((c) => c.id)
    if (campaignIds.length === 0) return

    const supabase = createClient()

    // Get current user id for channel naming
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const channel = supabase
        .channel(`creator-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'participants',
          },
          (payload) => {
            const p = payload.new as { campaign_id: string; email: string; joined_at: string }
            if (!campaignIds.includes(p.campaign_id)) return
            const camp = campaigns.find((c) => c.id === p.campaign_id)
            if (!camp) return
            const prefix = p.email.split('@')[0] ?? 'User'
            const newItem: CreatorActivityItem = {
              type: 'join',
              display_name: prefix.charAt(0).toUpperCase() + prefix.charAt(1) + '.',
              initial: prefix.charAt(0).toUpperCase(),
              campaign_name: camp.name,
              detail: 'joined the campaign',
              created_at: p.joined_at,
            }
            setData((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                recent_activity: [newItem, ...prev.recent_activity.slice(0, 19)],
                aggregate: {
                  ...prev.aggregate,
                  total_participants: prev.aggregate.total_participants + 1,
                },
              }
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'referral_clicks',
          },
          (payload) => {
            const rc = payload.new as { campaign_id: string; is_valid: boolean }
            if (!campaignIds.includes(rc.campaign_id)) return
            if (!rc.is_valid) {
              setData((prev) => {
                if (!prev) return prev
                return {
                  ...prev,
                  aggregate: {
                    ...prev.aggregate,
                    fraud_blocked: prev.aggregate.fraud_blocked + 1,
                  },
                  fraud_summary: {
                    ...prev.fraud_summary,
                    total: prev.fraud_summary.total + 1,
                  },
                }
              })
            } else {
              setData((prev) => {
                if (!prev) return prev
                return {
                  ...prev,
                  aggregate: {
                    ...prev.aggregate,
                    total_clicks: prev.aggregate.total_clicks + 1,
                  },
                }
              })
            }
          }
        )
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [campaigns])

  return { data, campaigns, loading, error, refresh: fetchData }
}
