'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildHowItWorksSteps } from '@/lib/campaign-helpers'
import { useAutosaveCampaign, type AutosaveStatus } from '@/lib/hooks/useAutosaveCampaign'
import { loadLocal, clearLocal, type LocalDraft } from '@/lib/campaignDraftStorage'
import type {
  CreateCampaignPayload,
  CreateRewardTierPayload,
  KpiType,
  RewardType,
} from '@/types'
import VisualEditor from './VisualEditor'

/* ── Constants ───────────────────────────────────────── */

const EMPTY_TIER: CreateRewardTierPayload = {
  tier_order: 1,
  label: 'Main Reward',
  threshold: 50,
  reward_type: 'file' as RewardType,
  reward_label: '',
  access_duration_hours: 72,
}

const INITIAL: Partial<CreateCampaignPayload> = {
  name: '',
  headline: '',
  subheadline: '',
  description: '',
  destination_url: '',
  hero_image_url: '',
  creator_display_name: '',
  creator_photo_url: '',
  benefits: [''],
  how_it_works: [],
  kpi_type: undefined as unknown as KpiType,
  show_countdown: false,
  social_proof_visible: true,
  participant_cap: undefined,
  deadline: undefined,
  reward_tiers: [{ ...EMPTY_TIER }],
  landing_template: 'starter',
  landing_config: {},
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */

export default function CampaignWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [screen, setScreen] = useState<'goal' | 'editor'>(editId ? 'editor' : 'goal')
  const [data, setData] = useState<Partial<CreateCampaignPayload>>(INITIAL)
  const [draftId, setDraftId] = useState<string | null>(editId)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!editId)
  const [loadError, setLoadError] = useState(false)
  const [recoveryDraft, setRecoveryDraft] = useState<LocalDraft | null>(null)

  /* ── Autosave hook ─────────────────────────────────── */
  // Enabled only while in editor screen and not in the initial loading state
  const autosaveEnabled = screen === 'editor' && !loading

  const autosaveStatus: AutosaveStatus = useAutosaveCampaign({
    data,
    draftId,
    enabled: autosaveEnabled,
    onSaved: () => { if (draftId) clearLocal(draftId) },
  })

  /* ── Load existing campaign (edit mode) ────────────── */
  useEffect(() => {
    if (!editId) return
    fetch(`/api/campaigns/${editId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((campaign) => {
        setData({
          name: campaign.name || '',
          headline: campaign.headline || '',
          subheadline: campaign.subheadline || '',
          description: campaign.description || '',
          destination_url: campaign.destination_url || '',
          hero_image_url: campaign.hero_image_url || '',
          creator_display_name: campaign.creator_display_name || '',
          creator_photo_url: campaign.creator_photo_url || '',
          benefits: campaign.benefits?.length ? campaign.benefits : [''],
          how_it_works: campaign.how_it_works || [],
          kpi_type: campaign.kpi_type || 'clicks',
          show_countdown: campaign.show_countdown ?? false,
          social_proof_visible: campaign.social_proof_visible ?? true,
          participant_cap: campaign.participant_cap ?? undefined,
          deadline: campaign.deadline ?? undefined,
          landing_template: campaign.landing_template || 'starter',
          landing_config: campaign.landing_config || {},
          reward_tiers: campaign.reward_tiers?.length
            ? campaign.reward_tiers.map((t: Record<string, unknown>) => ({
                tier_order: t.tier_order as number,
                label: t.label as string,
                threshold: t.threshold as number,
                reward_type: t.reward_type as RewardType,
                reward_label: t.reward_label as string,
                reward_url: t.reward_url as string | undefined,
                preview_teaser: t.preview_teaser as string | undefined,
                access_duration_hours: (t.access_duration_hours as number) ?? 72,
              }))
            : [{ ...EMPTY_TIER }],
        })

        // Check for a more recent local draft (unsaved changes from a previous session)
        const local = loadLocal(editId)
        const dbUpdatedAt = campaign.updated_at ? new Date(campaign.updated_at).getTime() : 0
        if (local && local.savedAt > dbUpdatedAt + 30_000) {
          setRecoveryDraft(local)
        }

        setLoading(false)
      })
      .catch(() => { setLoading(false); setLoadError(true) })
  }, [editId])

  /* ── Pre-fill creator name for new campaigns ───────── */
  useEffect(() => {
    if (editId) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.name || user.email?.split('@')[0] || ''
      setData((d) => ({ ...d, creator_display_name: d.creator_display_name || name }))
    })
  }, [editId])

  /* ── Unsaved-changes guard (beforeunload) ──────────── */
  useEffect(() => {
    if (!autosaveStatus.isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [autosaveStatus.isDirty])

  /* ── Update helper ─────────────────────────────────── */
  const update = useCallback((u: Partial<CreateCampaignPayload>) => {
    setData((d) => ({ ...d, ...u }))
    setSubmitError(null)
  }, [])

  /* ── Recovery actions ──────────────────────────────── */
  const handleRestore = useCallback(() => {
    if (!recoveryDraft) return
    setData(recoveryDraft.data)
    setRecoveryDraft(null)
  }, [recoveryDraft])

  const handleDiscardRecovery = useCallback(() => {
    if (draftId) clearLocal(draftId)
    setRecoveryDraft(null)
  }, [draftId])

  /* ── Auto-create draft when entering editor ────────── */
  const handleStartBuilding = useCallback(async () => {
    setScreen('editor')
    if (draftId) return // already has an ID (edit mode)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          kpi_type: data.kpi_type || 'clicks',
          headline: data.name, // placeholder — user will update in editor
          destination_url: 'https://', // placeholder — passes non-empty validation
          reward_tiers: [{ ...EMPTY_TIER }],
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setDraftId(created.id)
        // Update URL so refresh/back button still works
        window.history.replaceState(
          {},
          '',
          `/dashboard/creator/campaigns/new?edit=${created.id}`
        )
      }
    } catch {
      // Non-critical — autosave will create the draft on next save
    }
  }, [data, draftId])

  /* ── Manual save (bypasses autosave debounce) ──────── */
  const saveDraft = useCallback(async () => {
    setSaving(true)
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        benefits: (data.benefits || []).filter(Boolean),
        how_it_works: data.how_it_works?.length ? data.how_it_works : buildHowItWorksSteps(data.kpi_type || 'clicks'),
      }
      if (draftId) {
        const res = await fetch(`/api/campaigns/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      } else {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
        const created = await res.json()
        setDraftId(created.id)
        window.history.replaceState(
          {},
          '',
          `/dashboard/creator/campaigns/new?edit=${created.id}`
        )
      }
      // Clear localStorage since DB is now in sync
      if (draftId) clearLocal(draftId)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [data, draftId])

  /* ── Publish ───────────────────────────────────────── */
  const handlePublish = useCallback(async (slug: string) => {
    setPublishing(true)
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        benefits: (data.benefits || []).filter(Boolean),
        how_it_works: data.how_it_works?.length ? data.how_it_works : buildHowItWorksSteps(data.kpi_type || 'clicks'),
      }
      let campaignId = draftId
      if (campaignId) {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
      } else {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create')
        const created = await res.json()
        campaignId = created.id
        setDraftId(campaignId)
      }
      /* Set custom slug + activate */
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      // Clear localStorage on successful publish
      if (campaignId) clearLocal(campaignId)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }, [data, draftId])

  /* ── Render ────────────────────────────────────────── */

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load campaign.</p>
        <button className="vs-btn" onClick={() => router.back()}>← Go Back</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--ink3)', fontSize: 14 }}>
        Loading campaign...
      </div>
    )
  }

  if (screen === 'editor') {
    return (
      <VisualEditor
        data={data}
        update={update}
        saveDraft={saveDraft}
        handlePublish={handlePublish}
        draftId={draftId}
        saving={saving}
        publishing={publishing}
        submitError={submitError}
        autosaveStatus={autosaveStatus}
        recoveryDraft={recoveryDraft}
        onRestore={handleRestore}
        onDiscardRecovery={handleDiscardRecovery}
        editId={editId}
      />
    )
  }

  /* ── Goal Screen ─────────────────────────────────────── */
  return (
    <GoalScreen
      data={data}
      update={update}
      onStart={handleStartBuilding}
      onCancel={() => router.push('/dashboard/creator')}
    />
  )
}

/* ── Goal Screen Component ───────────────────────────── */

const KPI_OPTIONS = [
  {
    value: 'clicks' as const,
    icon: '🔗',
    label: 'Clicks',
    difficulty: 'Easy',
    desc: 'Track unique visitors to your link',
    example: 'Get 50 unique clicks',
    rec: '30–100 clicks for most prizes',
  },
  {
    value: 'registrations' as const,
    icon: '📋',
    label: 'Signups',
    difficulty: 'Medium',
    desc: 'Track people who register or sign up',
    example: 'Get 30 people to sign up',
    rec: '15–50 signups (about 40% of clicks)',
  },
  {
    value: 'purchases' as const,
    icon: '💳',
    label: 'Purchases',
    difficulty: 'Hard',
    desc: 'Track completed purchases or payments',
    example: 'Get 10 people to buy',
    rec: '5–20 purchases (about 10% of clicks)',
  },
]

function GoalScreen({
  data,
  update,
  onStart,
  onCancel,
}: {
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  onStart: () => void
  onCancel: () => void
}) {
  const canStart = !!data.kpi_type && !!data.name?.trim()

  return (
    <div className="ve-goal-page">
      <div className="ve-goal-card">
        <div className="ve-goal-logo">ValueShare</div>
        <h1 className="ve-goal-title">Create your campaign</h1>
        <p className="ve-goal-sub">Choose a goal and give your campaign a name to get started. You&apos;ll customize everything else in the editor.</p>

        {/* Campaign Name */}
        <div className="ve-goal-field">
          <label className="ve-goal-label">Campaign Name</label>
          <input
            className="ve-goal-input"
            value={data.name || ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Summer Referral Program"
            autoFocus
          />
        </div>

        {/* KPI Type */}
        <div className="ve-goal-field">
          <label className="ve-goal-label">Campaign Goal</label>
          <div className="ve-goal-kpi-cards">
            {KPI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`ve-goal-kpi-card${data.kpi_type === opt.value ? ' active' : ''}`}
                onClick={() => update({ kpi_type: opt.value })}
              >
                <span className="ve-goal-kpi-card-icon">{opt.icon}</span>
                <div className="ve-goal-kpi-card-body">
                  <span className="ve-goal-kpi-card-name">{opt.label}</span>
                  <span className="ve-goal-kpi-card-desc">{opt.desc}</span>
                </div>
                <span className={`ve-goal-kpi-badge ve-goal-kpi-badge--${opt.difficulty}`}>
                  {opt.difficulty}
                </span>
              </button>
            ))}
          </div>
          {data.kpi_type && (() => {
            const opt = KPI_OPTIONS.find((o) => o.value === data.kpi_type)!
            return (
              <div className="ve-goal-kpi-info">
                <p className="ve-goal-kpi-info-example">Example: &ldquo;{opt.example}&rdquo;</p>
                <p className="ve-goal-kpi-info-rec">Recommended: {opt.rec}</p>
              </div>
            )
          })()}
        </div>

        <button
          className="ve-goal-start"
          onClick={onStart}
          disabled={!canStart}
        >
          Start Building →
        </button>

        <button
          onClick={onCancel}
          style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 13, color: 'var(--ink3)', cursor: 'pointer', width: '100%', textAlign: 'center', padding: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
