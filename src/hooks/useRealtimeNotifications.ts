'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

interface UseRealtimeNotificationsResult {
  newNotification: Notification | null
  clearNewNotification: () => void
}

export function useRealtimeNotifications(
  userId: string | null,
  onNotification: (n: Notification) => void
): UseRealtimeNotificationsResult {
  const [newNotification, setNewNotification] = useState<Notification | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification
          callbackRef.current(n)
          setNewNotification(n)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  const clearNewNotification = useCallback(() => setNewNotification(null), [])

  return { newNotification, clearNewNotification }
}
