'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReferralClick } from '@/types'

interface UseRealtimeClicksResult {
  realtimeClicks: ReferralClick[]
  realtimeClickCount: number | null
}

export function useRealtimeClicks(
  participantId: string | null,
  campaignId: string | null,
  initialClickCount: number
): UseRealtimeClicksResult {
  const [realtimeClicks, setRealtimeClicks] = useState<ReferralClick[]>([])
  const [realtimeClickCount, setRealtimeClickCount] = useState<number | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!participantId || !campaignId) return

    // Reset on campaign change
    setRealtimeClicks([])
    setRealtimeClickCount(null)

    const supabase = createClient()

    const channel = supabase
      .channel(`participant-${participantId}-${campaignId}`)
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participantId}`,
        },
        (payload) => {
          const updated = payload.new as { click_count: number }
          setRealtimeClickCount(updated.click_count)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [participantId, campaignId])

  return {
    realtimeClicks,
    realtimeClickCount: realtimeClickCount ?? initialClickCount,
  }
}
