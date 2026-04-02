'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { CreateCampaignPayload } from '@/types'
import { saveLocal, clearLocal } from '@/lib/campaignDraftStorage'

export type AutosavePhase = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutosaveStatus {
  phase: AutosavePhase
  lastSavedAt: Date | null
  isDirty: boolean
  error: string | null
}

interface Options {
  data: Partial<CreateCampaignPayload>
  draftId: string | null
  /** Only autosave when true (false = goal screen / loading state) */
  enabled: boolean
  /** Called after a successful DB save */
  onSaved?: () => void
}

export function useAutosaveCampaign({ data, draftId, enabled, onSaved }: Options): AutosaveStatus {
  const [phase, setPhase] = useState<AutosavePhase>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Always-fresh refs — avoids stale closures inside timers
  const dataRef = useRef(data)
  dataRef.current = data
  const draftIdRef = useRef(draftId)
  draftIdRef.current = draftId
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  // Tracks whether hook has received its first "enabled" trigger (skip initial data load)
  const enabledOnceRef = useRef(false)

  const doDbSave = useCallback(async () => {
    const currentId = draftIdRef.current
    if (!currentId || isSavingRef.current) return
    isSavingRef.current = true
    setPhase('saving')

    try {
      const payload = {
        ...dataRef.current,
        benefits: (dataRef.current.benefits || []).filter(Boolean),
      }
      const res = await fetch(`/api/campaigns/${currentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Save failed')
      }
      setPhase('saved')
      setLastSavedAt(new Date())
      setIsDirty(false)
      setError(null)
      clearLocal(currentId)
      onSavedRef.current?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setPhase('error')
      setError(msg)
      // Auto-retry after 10 s
      retryTimerRef.current = setTimeout(() => { doDbSave() }, 10_000)
    } finally {
      isSavingRef.current = false
    }
  }, []) // empty — all values read via refs

  useEffect(() => {
    if (!enabled) {
      // Reset when disabled (e.g. switched back to goal screen)
      enabledOnceRef.current = false
      return
    }

    // Skip the very first trigger after becoming enabled — that's the initial data load
    if (!enabledOnceRef.current) {
      enabledOnceRef.current = true
      return
    }

    // ── Real user change ─────────────────────────────────────
    setIsDirty(true)
    setPhase((prev) => (prev === 'saving' ? 'saving' : 'pending'))

    // Layer 1: localStorage (200 ms debounce — instant backup)
    if (localTimerRef.current) clearTimeout(localTimerRef.current)
    localTimerRef.current = setTimeout(() => {
      const id = draftIdRef.current
      if (id) saveLocal(id, dataRef.current)
    }, 200)

    // Layer 2: DB save (3 s debounce)
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (draftIdRef.current) {
      dbTimerRef.current = setTimeout(doDbSave, 3_000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled, draftId]) // doDbSave intentionally omitted (stable via empty deps)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
      if (dbTimerRef.current) clearTimeout(dbTimerRef.current)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  return { phase, lastSavedAt, isDirty, error }
}
