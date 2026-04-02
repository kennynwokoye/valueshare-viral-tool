'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LiveJoinCountProps {
  campaignId: string
  initialCount: number
}

export default function LiveJoinCount({ campaignId, initialCount }: LiveJoinCountProps) {
  const [count, setCount] = useState(initialCount)
  const [showJoinToast, setShowJoinToast] = useState(false)
  const [bumping, setBumping] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`landing-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          setCount((prev) => prev + 1)
          setBumping(true)
          setTimeout(() => setBumping(false), 500)
          setShowJoinToast(true)
          setTimeout(() => setShowJoinToast(false), 3000)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [campaignId])

  return (
    <>
      <div className="cl-social-proof">
        <span className="cl-social-fire">🔥</span>{' '}
        <span className={bumping ? 'ljc-bump' : ''}>{count}</span>{' '}
        {count === 1 ? 'person has' : 'people have'} already joined
      </div>
      {showJoinToast && (
        <div className="ljc-toast">
          ✨ Someone just joined!
        </div>
      )}
    </>
  )
}
