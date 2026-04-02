import type { CreateCampaignPayload } from '@/types'

export interface LocalDraft {
  data: Partial<CreateCampaignPayload>
  savedAt: number // Date.now()
  draftId: string
}

const key = (id: string) => `vs_draft_${id}`

export function saveLocal(id: string, data: Partial<CreateCampaignPayload>): void {
  try {
    const entry: LocalDraft = { data, savedAt: Date.now(), draftId: id }
    localStorage.setItem(key(id), JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadLocal(id: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return null
    return JSON.parse(raw) as LocalDraft
  } catch {
    return null
  }
}

export function clearLocal(id: string): void {
  try {
    localStorage.removeItem(key(id))
  } catch {
    // Ignore
  }
}
