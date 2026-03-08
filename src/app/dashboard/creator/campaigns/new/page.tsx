'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildHowItWorksSteps } from '@/lib/campaign-helpers'
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
  const [draftSaved, setDraftSaved] = useState(false)
  const [published, setPublished] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!editId)

  /* Load existing campaign for edit mode */
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
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [editId])

  /* Pre-fill creator name for new campaigns */
  useEffect(() => {
    if (editId) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.name || user.email?.split('@')[0] || ''
      setData((d) => ({ ...d, creator_display_name: d.creator_display_name || name }))
    })
  }, [editId])

  const update = useCallback((u: Partial<CreateCampaignPayload>) => {
    setData((d) => ({ ...d, ...u }))
    setDraftSaved(false)
  }, [])

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
      }
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [data, draftId])

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
      /* Set custom slug + status to active */
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
      setPublished(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }, [data, draftId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--ink3)', fontSize: 14 }}>
        Loading campaign...
      </div>
    )
  }

  if (published) {
    const campaignSlug = slugify(data.name || '')
    return (
      <div className="cw-success">
        <div className="cw-success-ico">🎉</div>
        <div className="cw-success-title">Campaign Published!</div>
        <div className="cw-success-sub">Your campaign is now live and ready to receive participants.</div>
        <div className="cw-success-url-box">
          <div className="cw-success-url-label">Your campaign is live at:</div>
          <div className="cw-success-url">valueshare.me/c/{campaignSlug}</div>
        </div>
        <div className="cw-success-actions">
          <button className="vs-btn vs-btn-primary" onClick={() => router.push('/dashboard/creator')}>
            ← Back to Dashboard
          </button>
        </div>
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
        draftSaved={draftSaved}
        editId={editId}
      />
    )
  }

  /* ── Goal Screen ─────────────────────────────────────── */
  return (
    <GoalScreen
      data={data}
      update={update}
      onStart={() => setScreen('editor')}
      onCancel={() => router.push('/dashboard/creator')}
    />
  )
}

/* ── Goal Screen Component ───────────────────────────── */

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
          <div className="ve-goal-kpi">
            <button
              className={`ve-goal-kpi-opt${data.kpi_type === 'clicks' ? ' active' : ''}`}
              onClick={() => update({ kpi_type: 'clicks' })}
            >
              <span className="ve-goal-kpi-icon">🔗</span>
              Clicks
            </button>
            <button
              className={`ve-goal-kpi-opt${data.kpi_type === 'registrations' ? ' active' : ''}`}
              onClick={() => update({ kpi_type: 'registrations' })}
            >
              <span className="ve-goal-kpi-icon">📋</span>
              Signups
            </button>
            <button
              className={`ve-goal-kpi-opt${data.kpi_type === 'purchases' ? ' active' : ''}`}
              onClick={() => update({ kpi_type: 'purchases' })}
            >
              <span className="ve-goal-kpi-icon">💳</span>
              Purchases
            </button>
          </div>
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
