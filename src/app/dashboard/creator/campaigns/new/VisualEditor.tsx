'use client'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LANDING_TEMPLATES,
  mergeLandingConfig,
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  getDefaultSectionOrder,
  buildHowItWorksSteps,
} from '@/lib/campaign-helpers'
import type {
  CreateCampaignPayload,
  CreateRewardTierPayload,
  LandingConfig,
  LandingTemplate,
  RewardType,
} from '@/types'
import type { AutosaveStatus } from '@/lib/hooks/useAutosaveCampaign'
import type { LocalDraft } from '@/lib/campaignDraftStorage'
import CampaignPreview from './CampaignPreview'

/* ── Types ───────────────────────────────────────────── */

interface VisualEditorProps {
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  saveDraft: () => Promise<void>
  handlePublish: (slug: string) => Promise<void>
  draftId: string | null
  saving: boolean
  publishing: boolean
  submitError: string | null
  autosaveStatus: AutosaveStatus
  recoveryDraft: LocalDraft | null
  onRestore: () => void
  onDiscardRecovery: () => void
  editId: string | null
}

/* ── Helpers ─────────────────────────────────────────── */

function timeSince(date: Date | null): string {
  if (!date) return 'just now'
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

/* ── Original Helpers ────────────────────────────────── */

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function updateConfig(
  data: Partial<CreateCampaignPayload>,
  patch: Partial<LandingConfig>
): Partial<LandingConfig> {
  return { ...(data.landing_config || {}), ...patch }
}

const SECTION_ICONS: Record<string, string> = {
  hero_image: '🖼️',
  video: '🎬',
  subheadline: '📝',
  description: '📄',
  cta1: '🔗',
  benefits: '✅',
  cta2: '🔗',
  how_it_works: '⚙️',
  faqs: '❓',
  creator_bio: '👤',
  reward: '🎁',
  tiers: '🏆',
  countdown: '⏳',
  join_form: '📩',
  promo_pack: '📦',
}

const REQUIRED_SECTIONS = new Set(['description', 'join_form'])

const REWARD_TYPES: { value: RewardType; icon: string; name: string }[] = [
  { value: 'file', icon: '📄', name: 'Digital File' },
  { value: 'video_url', icon: '🎥', name: 'Video / Course' },
  { value: 'call_booking', icon: '📞', name: '1-on-1 Call' },
  { value: 'external_url', icon: '🔗', name: 'External URL' },
]

/* ── Main Component ──────────────────────────────────── */

export default function VisualEditor({
  data,
  update,
  saveDraft,
  handlePublish,
  draftId,
  saving,
  publishing,
  submitError,
  autosaveStatus,
  recoveryDraft,
  onRestore,
  onDiscardRecovery,
}: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'settings' | 'design'>('sections')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [showPublishDrawer, setShowPublishDrawer] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const deviceWidth = previewDevice === 'mobile' ? 375 : previewDevice === 'tablet' ? 768 : undefined

  const config = mergeLandingConfig(
    (data.landing_template || 'starter') as LandingTemplate,
    (data.landing_config || {}) as LandingConfig
  )

  /* Current section order */
  const sectionOrder = config.sectionOrder && config.sectionOrder.length > 0
    ? config.sectionOrder
    : getDefaultSectionOrder(config.formPosition)

  const updateOrder = useCallback((newOrder: string[]) => {
    update({ landing_config: updateConfig(data, { sectionOrder: newOrder }) })
  }, [data, update])

  /* Toggle a section visible/hidden */
  const toggleSection = useCallback((key: string) => {
    if (REQUIRED_SECTIONS.has(key)) return
    const current = [...sectionOrder]
    if (current.includes(key)) {
      updateOrder(current.filter((k) => k !== key))
    } else {
      // Re-insert at its default position
      const defaultIdx = DEFAULT_SECTION_ORDER.indexOf(key)
      const newOrder = [...current]
      const insertBefore = DEFAULT_SECTION_ORDER.slice(defaultIdx + 1).find((k) => newOrder.includes(k))
      if (insertBefore) {
        const insertAt = newOrder.indexOf(insertBefore)
        newOrder.splice(insertAt, 0, key)
      } else {
        newOrder.push(key)
      }
      updateOrder(newOrder)
    }
  }, [sectionOrder, updateOrder])

  /* DnD */
  const onDragStart = (i: number) => setDragging(i)
  const onDragEnd = () => { setDragging(null); setDragOver(null) }
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i) }
  const onDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragging === null || dragging === i) { setDragging(null); setDragOver(null); return }
    const arr = [...sectionOrder]
    const [moved] = arr.splice(dragging, 1)
    arr.splice(i, 0, moved)
    updateOrder(arr)
    setDragging(null)
    setDragOver(null)
  }

  /* All 14 section keys (including hidden ones) */
  const allSections = DEFAULT_SECTION_ORDER

  return (
    <>
      {recoveryDraft && (
        <div className="ve-recovery-banner">
          <span className="ve-recovery-msg">
            ↩ You have unsaved changes from {timeSince(new Date(recoveryDraft.savedAt))} — restore them?
          </span>
          <div className="ve-recovery-actions">
            <button className="ve-recovery-btn restore" onClick={onRestore}>Restore</button>
            <button className="ve-recovery-btn discard" onClick={onDiscardRecovery}>Keep saved version</button>
          </div>
        </div>
      )}
    <div className="ve-layout">
      {/* Header */}
      <div className="ve-header">
        <span className="ve-header-logo">VS</span>
        <div className="ve-header-sep" />
        <input
          className="ve-header-name"
          value={data.name || ''}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Campaign name..."
        />
        <div className="ve-header-sep" />
        {autosaveStatus.phase === 'saving' && (
          <span style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="ve-save-dot saving" /> Saving…
          </span>
        )}
        {autosaveStatus.phase === 'saved' && (
          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ {timeSince(autosaveStatus.lastSavedAt)}</span>
        )}
        {autosaveStatus.phase === 'pending' && (
          <span style={{ fontSize: 11, color: 'var(--ink3)', opacity: 0.6 }}>● Unsaved</span>
        )}
        {autosaveStatus.phase === 'error' && (
          <button style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }} onClick={saveDraft}>
            ✗ Save failed · retry
          </button>
        )}
        {submitError && <span style={{ fontSize: 11, color: '#ef4444' }}>{submitError}</span>}
        <button className="ve-header-btn" onClick={saveDraft} disabled={saving}>
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button className="ve-header-btn primary" onClick={() => setShowPublishDrawer(true)}>
          Publish
        </button>
      </div>

      {/* Mobile tab toggle */}
      <div className="ve-mob-tabs">
        <button
          className={`ve-mob-tab${mobileTab === 'edit' ? ' active' : ''}`}
          onClick={() => setMobileTab('edit')}
        >
          ✏️ Edit
        </button>
        <button
          className={`ve-mob-tab${mobileTab === 'preview' ? ' active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          👁 Preview
        </button>
      </div>

      {/* Body */}
      <div className={`ve-body ve-body--${mobileTab}`}>
        {/* Left panel */}
        <div className="ve-left">
          <div className="ve-tabs">
            {(['sections', 'settings', 'design'] as const).map((tab) => (
              <button
                key={tab}
                className={`ve-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="ve-tab-content">
            {activeTab === 'sections' && (
              <SectionsTab
                allSections={allSections}
                sectionOrder={sectionOrder}
                expandedSection={expandedSection}
                dragging={dragging}
                dragOver={dragOver}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onToggle={toggleSection}
                onExpand={(key) => setExpandedSection(expandedSection === key ? null : key)}
                onExpandSection={(key) => { setExpandedSection(key); setActiveTab('sections') }}
                data={data}
                update={update}
                config={config}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab data={data} update={update} config={config} />
            )}
            {activeTab === 'design' && (
              <DesignTab data={data} update={update} config={config} />
            )}
          </div>
        </div>

        {/* Right panel — preview */}
        <div className="ve-right">
          <div className="ve-device-bar">
            {(['mobile', 'tablet', 'desktop'] as const).map((d) => (
              <button
                key={d}
                className={`ve-device-btn${previewDevice === d ? ' active' : ''}`}
                onClick={() => setPreviewDevice(d)}
              >
                {d === 'mobile' ? '📱 Mobile' : d === 'tablet' ? '⬜ Tablet' : '🖥 Desktop'}
              </button>
            ))}
          </div>
          <div className="ve-preview-wrap" style={deviceWidth ? { maxWidth: deviceWidth } : undefined}>
            <div className="ve-preview-bar">
              PREVIEW — this is how your page looks to visitors
            </div>
            <CampaignPreview data={data} />
          </div>
        </div>
      </div>

      {/* Publish drawer */}
      {showPublishDrawer && (
        <PublishDrawer
          data={data}
          campaignId={draftId}
          onClose={() => setShowPublishDrawer(false)}
          onSaveDraft={saveDraft}
          onPublish={handlePublish}
          publishing={publishing}
          saving={saving}
        />
      )}
    </div>
    </>
  )
}

/* ── Sections Tab ────────────────────────────────────── */

interface SectionsTabProps {
  allSections: string[]
  sectionOrder: string[]
  expandedSection: string | null
  dragging: number | null
  dragOver: number | null
  onDragStart: (i: number) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDrop: (e: React.DragEvent, i: number) => void
  onToggle: (key: string) => void
  onExpand: (key: string) => void
  onExpandSection: (key: string) => void
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  config: Required<LandingConfig>
}

function HeadlineRow({
  data,
  update,
  config,
  isExpanded,
  onExpand,
}: {
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  config: Required<LandingConfig>
  isExpanded: boolean
  onExpand: () => void
}) {
  const patchConfig = (patch: Partial<LandingConfig>) =>
    update({ landing_config: { ...(data.landing_config || {}), ...patch } })

  return (
    <div className={`ve-section-row${isExpanded ? ' row-expanded' : ''}`}>
      <div className="ve-section-header" onClick={onExpand}>
        <span className="ve-section-handle" style={{ opacity: 0.2, cursor: 'default' }}>⠿</span>
        <span className="ve-section-icon">✍️</span>
        <span className="ve-section-name">Headline</span>
        <span className="ve-section-badge">required</span>
        <span className={`ve-section-chevron${isExpanded ? ' open' : ''}`}>▼</span>
      </div>
      {isExpanded && (
        <div className="ve-section-edit">
          <div className="ve-field">
            <label className="ve-label">Headline text</label>
            <input
              className="ve-input"
              value={data.headline || ''}
              onChange={(e) => update({ headline: e.target.value })}
              placeholder="Your main campaign headline"
              maxLength={100}
            />
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{(data.headline || '').length}/100</span>
          </div>
          <div className="ve-field">
            <label className="ve-label">Font size</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <button
                  key={s}
                  className={`ve-font-opt${(config.headlineFontSize || 'lg') === s ? ' active' : ''}`}
                  onClick={() => patchConfig({ headlineFontSize: s })}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="ve-field">
            <label className="ve-label">Mobile size</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  className={`ve-font-opt${(config.headlineFontSizeMobile || 'md') === s ? ' active' : ''}`}
                  onClick={() => patchConfig({ headlineFontSizeMobile: s })}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionsTab({
  allSections,
  sectionOrder,
  expandedSection,
  dragging,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggle,
  onExpand,
  onExpandSection,
  data,
  update,
  config,
}: SectionsTabProps) {
  /* Show visible sections first (in order), then hidden sections */
  const hiddenSections = allSections.filter((k) => !sectionOrder.includes(k))

  return (
    <div className="ve-section-list">
      <HeadlineRow
        data={data}
        update={update}
        config={config}
        isExpanded={expandedSection === 'headline'}
        onExpand={() => onExpand('headline')}
      />
      {sectionOrder.map((key, i) => (
        <SectionRow
          key={key}
          sectionKey={key}
          index={i}
          visible={true}
          isExpanded={expandedSection === key}
          isDragging={dragging === i}
          isDragOver={dragOver === i}
          onDragStart={() => onDragStart(i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={(e) => onDrop(e, i)}
          onToggle={() => onToggle(key)}
          onExpand={() => onExpand(key)}
          onExpandSection={onExpandSection}
          data={data}
          update={update}
          config={config}
        />
      ))}

      {hiddenSections.length > 0 && (
        <>
          <div style={{ padding: '10px 4px 4px', fontSize: 10, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Hidden sections
          </div>
          {hiddenSections.map((key) => (
            <SectionRow
              key={key}
              sectionKey={key}
              index={-1}
              visible={false}
              isExpanded={expandedSection === key}
              isDragging={false}
              isDragOver={false}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onDragOver={() => {}}
              onDrop={() => {}}
              onToggle={() => onToggle(key)}
              onExpand={() => onExpand(key)}
              onExpandSection={onExpandSection}
              data={data}
              update={update}
              config={config}
            />
          ))}
        </>
      )}
    </div>
  )
}

/* ── Section Row ─────────────────────────────────────── */

interface SectionRowProps {
  sectionKey: string
  index: number
  visible: boolean
  isExpanded: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onToggle: () => void
  onExpand: () => void
  onExpandSection: (key: string) => void
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  config: Required<LandingConfig>
}

function SectionRow({
  sectionKey,
  visible,
  isExpanded,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggle,
  onExpand,
  onExpandSection,
  data,
  update,
  config,
}: SectionRowProps) {
  const isRequired = REQUIRED_SECTIONS.has(sectionKey)

  const classes = [
    've-section-row',
    isDragging ? 'row-dragging' : '',
    isDragOver ? 'row-drag-over' : '',
    isExpanded ? 'row-expanded' : '',
    !visible ? 'row-hidden' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      draggable={visible}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="ve-section-header" onClick={onExpand}>
        <span className="ve-section-handle">⠿</span>
        <span className="ve-section-icon">{SECTION_ICONS[sectionKey]}</span>
        <span className="ve-section-name">{SECTION_LABELS[sectionKey]}</span>
        {(config.hiddenOnMobile || []).includes(sectionKey) && (
          <span style={{ fontSize: 10, opacity: 0.6 }} title="Hidden on mobile">📵</span>
        )}
        {!isRequired && (
          <button
            className={`ve-section-toggle ${visible ? 'on' : 'off'}`}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            title={visible ? 'Hide section' : 'Show section'}
          />
        )}
        {isRequired && (
          <span className="ve-section-badge">required</span>
        )}
        <span className={`ve-section-chevron${isExpanded ? ' open' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="ve-section-edit">
          <SectionEditPanel sectionKey={sectionKey} data={data} update={update} config={config} onExpandSection={onExpandSection} />
          <div className="ve-toggle-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
            <span className="ve-toggle-label" style={{ fontSize: 12 }}>📱 Hide on mobile</span>
            <label className="ve-toggle">
              <input
                type="checkbox"
                checked={(config.hiddenOnMobile || []).includes(sectionKey)}
                onChange={(e) => {
                  const current = config.hiddenOnMobile || []
                  update({ landing_config: { ...(data.landing_config || {}), hiddenOnMobile: e.target.checked
                    ? [...current, sectionKey]
                    : current.filter((k) => k !== sectionKey) } })
                }}
              />
              <span className="ve-toggle-slider" />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Section Edit Panels ─────────────────────────────── */

function SectionEditPanel({
  sectionKey,
  data,
  update,
  config,
  onExpandSection,
}: {
  sectionKey: string
  data: Partial<CreateCampaignPayload>
  update: (u: Partial<CreateCampaignPayload>) => void
  config: Required<LandingConfig>
  onExpandSection: (key: string) => void
}) {
  const patchConfig = (patch: Partial<LandingConfig>) =>
    update({ landing_config: { ...(data.landing_config || {}), ...patch } })

  switch (sectionKey) {
    case 'hero_image':
      return <HeroImagePanel data={data} update={update} config={config} />

    case 'video':
      return (
        <>
          <div className="ve-field">
            <label className="ve-label">Video URL</label>
            <input
              className="ve-input"
              value={config.videoUrl || ''}
              onChange={(e) => patchConfig({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>YouTube or Vimeo links supported</span>
          </div>
          <div className="ve-field">
            <label className="ve-label">Video Section Title</label>
            <input
              className="ve-input"
              value={config.videoTitle || ''}
              onChange={(e) => patchConfig({ videoTitle: e.target.value })}
              placeholder="Watch This First"
            />
          </div>
        </>
      )

    case 'subheadline':
      return (
        <div className="ve-field">
          <label className="ve-label">Sub-headline</label>
          <input
            className="ve-input"
            value={data.subheadline || ''}
            onChange={(e) => update({ subheadline: e.target.value })}
            placeholder="A short punchy line below the headline"
            maxLength={160}
          />
        </div>
      )

    case 'description':
      return (
        <div className="ve-field">
          <label className="ve-label">Description</label>
          <textarea
            className="ve-textarea"
            value={data.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Describe what participants get and why they should join..."
            rows={4}
          />
        </div>
      )

    case 'cta1':
      return (
        <div className="ve-field">
          <label className="ve-label">Button Text</label>
          <input
            className="ve-input"
            value={config.ctaText || ''}
            onChange={(e) => patchConfig({ ctaText: e.target.value })}
            placeholder="Get My ValueShare Link →"
          />
        </div>
      )

    case 'benefits':
      return (
        <>
          <div className="ve-field">
            <label className="ve-label">Section Title</label>
            <input
              className="ve-input"
              value={config.benefitsTitle || ''}
              onChange={(e) => patchConfig({ benefitsTitle: e.target.value })}
              placeholder="What You Get"
            />
          </div>
          <BulletsPanel values={data.benefits || ['']} onChange={(v) => update({ benefits: v })} label="Benefit" placeholder="e.g. Exclusive access to premium content" />
        </>
      )

    case 'cta2':
      return (
        <div className="ve-field">
          <label className="ve-label">Button Text</label>
          <input
            className="ve-input"
            value={config.cta2Text || ''}
            onChange={(e) => patchConfig({ cta2Text: e.target.value })}
            placeholder="Get My ValueShare Link →"
          />
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Leave empty to use the same text as CTA Button 1</span>
        </div>
      )

    case 'how_it_works':
      return (
        <>
          <div className="ve-field">
            <label className="ve-label">Section Title</label>
            <input
              className="ve-input"
              value={config.howItWorksTitle || ''}
              onChange={(e) => patchConfig({ howItWorksTitle: e.target.value })}
              placeholder="How It Works"
            />
          </div>
          <HowItWorksPanel data={data} update={update} />
        </>
      )

    case 'faqs':
      return <FaqsPanel config={config} patchConfig={patchConfig} />

    case 'creator_bio':
      return (
        <div className="ve-field">
          <label className="ve-label">Your Bio</label>
          <textarea
            className="ve-textarea"
            value={config.creatorBio || ''}
            onChange={(e) => patchConfig({ creatorBio: e.target.value })}
            placeholder="Tell participants a bit about yourself..."
            rows={3}
            maxLength={500}
          />
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{(config.creatorBio || '').length}/500</span>
        </div>
      )

    case 'reward':
      return <RewardPanel data={data} update={update} />

    case 'tiers':
      return (
        <p className="ve-section-edit-hint">
          The Tier Ladder shows when you have 2+ reward tiers.{' '}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0, fontFamily: 'inherit' }}
            onClick={() => onExpandSection('reward')}
          >
            Open Reward section →
          </button>
        </p>
      )

    case 'countdown':
      return (
        <>
          <div className="ve-toggle-row">
            <span className="ve-toggle-label">Show countdown timer</span>
            <label className="ve-toggle">
              <input
                type="checkbox"
                checked={data.show_countdown ?? false}
                onChange={(e) => update({ show_countdown: e.target.checked })}
              />
              <span className="ve-toggle-slider" />
            </label>
          </div>
          {data.show_countdown && (
            <div className="ve-field">
              <label className="ve-label">Deadline</label>
              <input
                className="ve-input"
                type="datetime-local"
                value={data.deadline ? data.deadline.slice(0, 16) : ''}
                onChange={(e) => update({ deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>
          )}
        </>
      )

    case 'join_form':
      return (
        <>
          <div className="ve-field">
            <label className="ve-label">CTA Button Text</label>
            <input
              className="ve-input"
              value={config.ctaText || ''}
              onChange={(e) => patchConfig({ ctaText: e.target.value })}
              placeholder="Get My ValueShare Link →"
            />
          </div>
          <div className="ve-toggle-row">
            <span className="ve-toggle-label">Show social proof count</span>
            <label className="ve-toggle">
              <input
                type="checkbox"
                checked={data.social_proof_visible ?? true}
                onChange={(e) => update({ social_proof_visible: e.target.checked })}
              />
              <span className="ve-toggle-slider" />
            </label>
          </div>
        </>
      )

    case 'promo_pack':
      return <PromoPackPanel data={data} update={update} />

    default:
      return null
  }
}

/* ── Hero Image Panel ────────────────────────────────── */

function HeroImagePanel({ data, update, config }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void; config: Required<LandingConfig> }) {
  const patchConfig = (patch: Partial<LandingConfig>) =>
    update({ landing_config: { ...(data.landing_config || {}), ...patch } })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `hero-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-assets').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(path)
      update({ hero_image_url: urlData.publicUrl })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="ve-img-upload">
      {data.hero_image_url ? (
        <div style={{ position: 'relative' }}>
          <img src={data.hero_image_url} alt="" className="ve-img-preview" />
          <button
            style={{ position: 'absolute', top: 6, right: 6, padding: '3px 8px', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
            onClick={() => update({ hero_image_url: '' })}
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="ve-img-drop">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          {uploading ? '⏳ Uploading...' : '📷 Click to upload hero image'}
          <div style={{ marginTop: 4, fontSize: 10 }}>JPG, PNG, WebP, GIF — recommended 1200×630</div>
        </label>
      )}
      {uploadError && <span style={{ fontSize: 11, color: '#ef4444' }}>{uploadError}</span>}
      {data.hero_image_url && (
        <>
          <div className="ve-field" style={{ marginTop: 12 }}>
            <label className="ve-label">Image position</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['below', 'background'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`ve-font-opt${(config.heroImageMode || 'below') === mode ? ' active' : ''}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => patchConfig({ heroImageMode: mode })}
                >
                  {mode === 'below' ? '📄 Below headline' : '🖼️ Behind headline'}
                </button>
              ))}
            </div>
          </div>
          {(config.heroImageMode || 'below') === 'background' && (
            <>
              <div className="ve-field">
                <label className="ve-label">Height</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['sm', 'md', 'lg', 'full'] as const).map((h) => (
                    <button
                      key={h}
                      className={`ve-font-opt${(config.heroImageHeight || 'md') === h ? ' active' : ''}`}
                      onClick={() => patchConfig({ heroImageHeight: h })}
                    >
                      {h.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ve-field">
                <label className="ve-label">Overlay darkness</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['light', 'medium', 'dark'] as const).map((o) => (
                    <button
                      key={o}
                      className={`ve-font-opt${(config.heroOverlayOpacity || 'medium') === o ? ' active' : ''}`}
                      onClick={() => patchConfig({ heroOverlayOpacity: o })}
                    >
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Promo Pack Panel ────────────────────────────────── */

function PromoPackPanel({ data, update }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `flyer-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-assets').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(path)
      update({ flyer_image_url: urlData.publicUrl })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <div className="ve-img-upload">
        {data.flyer_image_url ? (
          <div style={{ position: 'relative' }}>
            <img src={data.flyer_image_url} alt="" className="ve-img-preview" />
            <button
              style={{ position: 'absolute', top: 6, right: 6, padding: '3px 8px', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
              onClick={() => update({ flyer_image_url: '' })}
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="ve-img-drop">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            {uploading ? '⏳ Uploading...' : '📦 Click to upload campaign flyer'}
            <div style={{ marginTop: 4, fontSize: 10 }}>JPG, PNG, WebP, GIF — recommended 1080×1080</div>
          </label>
        )}
        {uploadError && <span style={{ fontSize: 11, color: '#ef4444' }}>{uploadError}</span>}
      </div>
      <div className="ve-field">
        <label className="ve-label">Suggested Caption</label>
        <textarea
          className="ve-textarea"
          value={data.flyer_caption || ''}
          onChange={(e) => update({ flyer_caption: e.target.value })}
          placeholder="Write a suggested social media caption for participants to use when sharing the flyer..."
          rows={3}
          maxLength={500}
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{(data.flyer_caption || '').length}/500</span>
      </div>
      <div className="ve-toggle-row">
        <span className="ve-toggle-label">Require participants to share the flyer</span>
        <label className="ve-toggle">
          <input
            type="checkbox"
            checked={data.require_flyer ?? false}
            onChange={(e) => update({ require_flyer: e.target.checked })}
          />
          <span className="ve-toggle-slider" />
        </label>
      </div>
    </>
  )
}

/* ── Bullets Panel ───────────────────────────────────── */

function BulletsPanel({ values, onChange, label, placeholder }: { values: string[]; onChange: (v: string[]) => void; label: string; placeholder: string }) {
  const items = values.length > 0 ? values : ['']
  return (
    <div className="ve-bullets">
      {items.map((v, i) => (
        <div key={i} className="ve-bullet-row">
          <input
            className="ve-input"
            value={v}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder={`${placeholder} ${i + 1}`}
          />
          <button className="ve-bullet-remove" onClick={() => onChange(items.filter((_, j) => j !== i))} title={`Remove ${label}`}>×</button>
        </div>
      ))}
      {items.length < 6 && (
        <button className="ve-add-btn" onClick={() => onChange([...items, ''])}>+ Add {label}</button>
      )}
    </div>
  )
}

/* ── How It Works Panel ──────────────────────────────── */

function HowItWorksPanel({ data, update }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void }) {
  const steps = data.how_it_works?.length
    ? data.how_it_works
    : buildHowItWorksSteps(data.kpi_type || 'clicks')

  function updateStep(i: number, field: 'title' | 'description', val: string) {
    const next = steps.map((s, j) => j === i ? { ...s, [field]: val } : s)
    update({ how_it_works: next })
  }

  return (
    <>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: 'var(--vs-bg)', borderRadius: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)' }}>STEP {s.step}</span>
          <input
            className="ve-input"
            value={s.title}
            onChange={(e) => updateStep(i, 'title', e.target.value)}
            placeholder="Step title"
          />
          <input
            className="ve-input"
            value={s.description}
            onChange={(e) => updateStep(i, 'description', e.target.value)}
            placeholder="Step description"
          />
        </div>
      ))}
    </>
  )
}

/* ── FAQs Panel ──────────────────────────────────────── */

function FaqsPanel({ config, patchConfig }: { config: Required<LandingConfig>; patchConfig: (p: Partial<LandingConfig>) => void }) {
  const faqs = config.faqs || []

  function update(i: number, field: 'question' | 'answer', val: string) {
    const next = faqs.map((f, j) => j === i ? { ...f, [field]: val } : f)
    patchConfig({ faqs: next })
  }

  return (
    <>
      {faqs.map((faq, i) => (
        <div key={i} className="ve-faq-pair">
          <button className="ve-faq-remove" onClick={() => patchConfig({ faqs: faqs.filter((_, j) => j !== i) })}>×</button>
          <input className="ve-input" value={faq.question} onChange={(e) => update(i, 'question', e.target.value)} placeholder="Question..." />
          <textarea className="ve-textarea" value={faq.answer} onChange={(e) => update(i, 'answer', e.target.value)} placeholder="Answer..." rows={2} style={{ minHeight: 50 }} />
        </div>
      ))}
      {faqs.length < 8 && (
        <button className="ve-add-btn" onClick={() => patchConfig({ faqs: [...faqs, { question: '', answer: '' }] })}>+ Add FAQ</button>
      )}
    </>
  )
}

/* ── Reward Panel ────────────────────────────────────── */

function RewardPanel({ data, update }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void }) {
  const tiers = data.reward_tiers || [{ tier_order: 1, label: 'Main Reward', threshold: 50, reward_type: 'file' as RewardType, reward_label: '', access_duration_hours: 72 }]
  const kpiLabel = data.kpi_type === 'registrations' ? 'signups' : (data.kpi_type || 'clicks')

  function updateTier(i: number, patch: Partial<CreateRewardTierPayload>) {
    const next = tiers.map((t, j) => j === i ? { ...t, ...patch } : t)
    update({ reward_tiers: next })
  }

  function addTier() {
    const maxThreshold = Math.max(...tiers.map((t) => t.threshold))
    update({
      reward_tiers: [
        ...tiers,
        { tier_order: tiers.length + 1, label: `Tier ${tiers.length + 1}`, threshold: maxThreshold + 25, reward_type: 'file' as RewardType, reward_label: '', access_duration_hours: 72 },
      ],
    })
  }

  return (
    <>
      {tiers.map((tier, i) => (
        <div key={i} className="ve-tier-row">
          {i > 0 && (
            <button className="ve-tier-remove" onClick={() => update({ reward_tiers: tiers.filter((_, j) => j !== i) })}>×</button>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase' }}>
            {i === 0 ? 'Main Reward' : `Tier ${i + 1}`}
          </span>

          {/* Reward type */}
          <div className="ve-reward-types">
            {REWARD_TYPES.map((rt) => (
              <button
                key={rt.value}
                className={`ve-reward-type${tier.reward_type === rt.value ? ' active' : ''}`}
                onClick={() => updateTier(i, { reward_type: rt.value })}
              >
                {rt.icon} {rt.name}
              </button>
            ))}
          </div>

          <div className="ve-field">
            <label className="ve-label">Reward Title</label>
            <input
              className="ve-input"
              value={tier.reward_label || ''}
              onChange={(e) => updateTier(i, { reward_label: e.target.value })}
              placeholder="e.g. Exclusive Ebook"
            />
          </div>

          <div className="ve-field">
            <label className="ve-label">Preview Teaser</label>
            <textarea
              className="ve-textarea"
              value={tier.preview_teaser || ''}
              onChange={(e) => updateTier(i, { preview_teaser: e.target.value })}
              placeholder="Describe what participants will get..."
              rows={2}
              style={{ minHeight: 50 }}
            />
          </div>

          <div className="ve-field">
            <label className="ve-label">{kpiLabel.charAt(0).toUpperCase() + kpiLabel.slice(1)} needed to unlock</label>
            <input
              className="ve-input"
              type="number"
              min={1}
              value={tier.threshold || ''}
              onChange={(e) => updateTier(i, { threshold: parseInt(e.target.value) || 0 })}
            />
          </div>

          {(tier.reward_type === 'video_url' || tier.reward_type === 'call_booking' || tier.reward_type === 'external_url') && (
            <div className="ve-field">
              <label className="ve-label">
                {tier.reward_type === 'video_url' ? 'Video URL' : tier.reward_type === 'call_booking' ? 'Booking URL' : 'Destination URL'}
              </label>
              <input
                className="ve-input"
                value={tier.reward_url || ''}
                onChange={(e) => updateTier(i, { reward_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      ))}

      {tiers.length < 4 && (
        <button className="ve-add-btn" onClick={addTier}>+ Add Tier</button>
      )}
    </>
  )
}

/* ── Settings Tab ────────────────────────────────────── */

function SettingsTab({ data, update, config }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void; config: Required<LandingConfig> }) {
  const patchConfig = (patch: Partial<LandingConfig>) =>
    update({ landing_config: { ...(data.landing_config || {}), ...patch } })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Creator</div>

      <div className="ve-field">
        <label className="ve-label">Creator Display Name</label>
        <input
          className="ve-input"
          value={data.creator_display_name || ''}
          onChange={(e) => update({ creator_display_name: e.target.value })}
          placeholder="Your Name or Brand"
        />
      </div>

      <CreatorPhotoPanel data={data} update={update} />

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign Details</div>

      <div className="ve-field">
        <label className="ve-label">Campaign Goal</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['clicks', 'registrations', 'purchases'] as const).map((k) => (
            <button
              key={k}
              className={`ve-font-opt${data.kpi_type === k ? ' active' : ''}`}
              onClick={() => update({ kpi_type: k })}
            >
              {k === 'registrations' ? 'Signups' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="ve-field">
        <label className="ve-label">Tagline Badge (optional)</label>
        <input
          className="ve-input"
          value={config.tagline || ''}
          onChange={(e) => patchConfig({ tagline: e.target.value })}
          placeholder="🔥 Limited Time Offer"
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Small badge shown above the headline</span>
      </div>

      <div className="ve-field">
        <label className="ve-label">Destination URL *</label>
        <input
          className="ve-input"
          value={data.destination_url || ''}
          onChange={(e) => update({ destination_url: e.target.value })}
          placeholder="https://yoursite.com"
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Where ValueShare links point to</span>
      </div>

      <div className="ve-field">
        <label className="ve-label">Thank You Page URL (optional)</label>
        <input
          className="ve-input"
          value={data.thankyou_page_url || ''}
          onChange={(e) => update({ thankyou_page_url: e.target.value })}
          placeholder="https://yoursite.com/thank-you"
        />
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Limits</div>

      <div className="ve-toggle-row">
        <span className="ve-toggle-label">Participant cap</span>
        <label className="ve-toggle">
          <input
            type="checkbox"
            checked={!!data.participant_cap}
            onChange={(e) => update({ participant_cap: e.target.checked ? 100 : undefined })}
          />
          <span className="ve-toggle-slider" />
        </label>
      </div>
      {!!data.participant_cap && (
        <div className="ve-field">
          <label className="ve-label">Maximum participants</label>
          <input
            className="ve-input"
            type="number"
            min={1}
            value={data.participant_cap || ''}
            onChange={(e) => update({ participant_cap: parseInt(e.target.value) || undefined })}
          />
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Widget</div>

      <div className="ve-field">
        <label className="ve-label">Widget Headline</label>
        <input
          className="ve-input"
          value={config.widgetHeadline || ''}
          onChange={(e) => patchConfig({ widgetHeadline: e.target.value })}
          placeholder={data.name || 'Campaign name'}
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Shown in embed widgets above the signup form</span>
      </div>

      <div className="ve-field">
        <label className="ve-label">Widget Sub-headline</label>
        <input
          className="ve-input"
          value={config.widgetSubheadline || ''}
          onChange={(e) => patchConfig({ widgetSubheadline: e.target.value })}
          placeholder="Get your ValueShare link"
        />
      </div>

      <div className="ve-color-row">
        <div className="ve-color-swatch">
          <input
            type="color"
            value={config.widgetPrimaryColor || config.accentColor}
            onChange={(e) => patchConfig({ widgetPrimaryColor: e.target.value })}
          />
        </div>
        <span className="ve-color-label">Widget Accent Color</span>
        <span className="ve-color-hex">{config.widgetPrimaryColor || config.accentColor}</span>
      </div>

      <div className="ve-field">
        <label className="ve-label">Popup Delay (seconds)</label>
        <input
          className="ve-input"
          type="number"
          min={0}
          max={30}
          value={config.widgetDelay ?? 5}
          onChange={(e) => patchConfig({ widgetDelay: Math.max(0, Math.min(30, parseInt(e.target.value) || 0)) })}
        />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>0 = popup appears immediately on page load</span>
      </div>

      <div className="ve-field">
        <label className="ve-label">Widget Position</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['inline', 'bottom-right', 'top-banner'] as const).map((pos) => (
            <button
              key={pos}
              className={`ve-font-opt${config.widgetPosition === pos ? ' active' : ''}`}
              onClick={() => patchConfig({ widgetPosition: pos })}
            >
              {pos === 'inline' ? 'Inline' : pos === 'bottom-right' ? 'Bottom Right' : 'Top Banner'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Controls the generated code in Widget Browser</span>
      </div>
    </div>
  )
}

/* ── Creator Photo Panel ─────────────────────────────── */

function CreatorPhotoPanel({ data, update }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `creator-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      update({ creator_photo_url: urlData.publicUrl })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="ve-field">
      <label className="ve-label">Creator Photo</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {data.creator_photo_url ? (
          <img src={data.creator_photo_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--coral)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            {(data.creator_display_name || 'C')[0].toUpperCase()}
          </div>
        )}
        <label style={{ cursor: 'pointer', fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          {uploading ? 'Uploading...' : data.creator_photo_url ? 'Change photo' : 'Upload photo'}
        </label>
        {data.creator_photo_url && (
          <button onClick={() => update({ creator_photo_url: '' })} style={{ fontSize: 11, color: 'var(--ink3)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
        )}
      </div>
      {uploadError && <span style={{ fontSize: 11, color: '#ef4444' }}>{uploadError}</span>}
    </div>
  )
}

/* ── Design Tab ──────────────────────────────────────── */

function DesignTab({ data, update, config }: { data: Partial<CreateCampaignPayload>; update: (u: Partial<CreateCampaignPayload>) => void; config: Required<LandingConfig> }) {
  const patchConfig = (patch: Partial<LandingConfig>) =>
    update({ landing_config: { ...(data.landing_config || {}), ...patch } })

  function selectTemplate(key: LandingTemplate) {
    update({ landing_template: key, landing_config: {} })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template</div>

      <div className="ve-template-grid">
        {LANDING_TEMPLATES.map((tpl) => (
          <div
            key={tpl.key}
            className={`ve-template-card${data.landing_template === tpl.key ? ' selected' : ''}`}
            onClick={() => selectTemplate(tpl.key)}
          >
            <div
              className="ve-template-swatch"
              style={{ background: `linear-gradient(135deg, ${tpl.defaults.bgColor} 60%, ${tpl.defaults.accentColor})` }}
            />
            <div className="ve-template-name">{tpl.name}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colors</div>

      {[
        { key: 'accentColor' as const, label: 'Accent Color', value: config.accentColor },
        { key: 'bgColor' as const, label: 'Background Color', value: config.bgColor },
        { key: 'textColor' as const, label: 'Text Color', value: config.textColor },
      ].map(({ key, label, value }) => (
        <div key={key} className="ve-color-row">
          <div className="ve-color-swatch">
            <input type="color" value={value} onChange={(e) => patchConfig({ [key]: e.target.value })} />
          </div>
          <span className="ve-color-label">{label}</span>
          <span className="ve-color-hex">{value}</span>
        </div>
      ))}

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Typography</div>

      <div className="ve-field">
        <label className="ve-label">Heading Font</label>
        <div className="ve-font-toggle">
          <button
            className={`ve-font-opt${config.headingFont === 'cabinet' ? ' active' : ''}`}
            onClick={() => patchConfig({ headingFont: 'cabinet' })}
          >
            Cabinet Grotesk
          </button>
          <button
            className={`ve-font-opt${config.headingFont === 'lora' ? ' active' : ''}`}
            onClick={() => patchConfig({ headingFont: 'lora' })}
          >
            Lora (serif)
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Form Position</div>

      <div className="ve-position-opts">
        {(['bottom', 'top', 'right'] as const).map((pos) => (
          <button
            key={pos}
            className={`ve-position-opt${config.formPosition === pos ? ' active' : ''}`}
            onClick={() => patchConfig({ formPosition: pos })}
          >
            {pos}
          </button>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Controls where the signup form appears on the page</span>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Visibility</div>

      {[
        { key: 'showBenefits' as const, label: 'Benefits section' },
        { key: 'showHowItWorks' as const, label: 'How It Works section' },
        { key: 'showSocialProof' as const, label: 'Social proof count' },
        { key: 'showCountdown' as const, label: 'Countdown timer' },
      ].map(({ key, label }) => (
        <div key={key} className="ve-toggle-row">
          <span className="ve-toggle-label">{label}</span>
          <label className="ve-toggle">
            <input
              type="checkbox"
              checked={config[key] as boolean}
              onChange={(e) => patchConfig({ [key]: e.target.checked })}
            />
            <span className="ve-toggle-slider" />
          </label>
        </div>
      ))}
    </div>
  )
}

/* ── Publish Drawer ──────────────────────────────────── */

function PublishDrawer({
  data,
  campaignId,
  onClose,
  onSaveDraft,
  onPublish,
  publishing,
  saving,
}: {
  data: Partial<CreateCampaignPayload>
  campaignId: string | null
  onClose: () => void
  onSaveDraft: () => Promise<void>
  onPublish: (slug: string) => Promise<void>
  publishing: boolean
  saving: boolean
}) {
  const [slug, setSlug] = useState(slugify(data.name || ''))
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [successSlug, setSuccessSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        let query = supabase.from('campaigns').select('id').eq('slug', slug)
        // Exclude the current campaign so editing its own slug doesn't show "taken"
        if (campaignId) query = query.neq('id', campaignId)
        const { data: existing } = await query.maybeSingle()
        setSlugStatus(existing ? 'taken' : 'available')
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [slug, campaignId])

  async function doPublish() {
    setError(null)
    if (!data.headline?.trim()) { setError('Headline is required'); return }
    if (!data.description?.trim()) { setError('Description is required'); return }
    if (!data.destination_url?.trim()) { setError('Destination URL is required'); return }
    if (!data.reward_tiers?.length || !data.reward_tiers[0].reward_label?.trim()) {
      setError('Reward title is required'); return
    }
    try {
      await onPublish(slug)
      setSuccessSlug(slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  const liveUrl = `valueshare.co/c/${successSlug}`

  function handleCopyUrl() {
    navigator.clipboard.writeText(`https://${liveUrl}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ve-drawer-overlay" onClick={successSlug ? undefined : onClose}>
      <div className="ve-drawer" onClick={(e) => e.stopPropagation()}>
        {successSlug ? (
          <>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div className="ve-drawer-title" style={{ marginBottom: 6 }}>Campaign Published!</div>
              <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>Your campaign is live and ready to receive participants.</p>
            </div>
            <div style={{ background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Live at</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flex: 1, wordBreak: 'break-all' }}>{liveUrl}</span>
                <button
                  onClick={handleCopyUrl}
                  style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 7, border: '1.5px solid var(--border2)', background: copied ? 'rgba(5,150,105,.1)' : 'var(--white)', color: copied ? '#059669' : 'var(--ink2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="ve-drawer-actions">
              <button className="ve-header-btn" onClick={onClose} style={{ flex: 1, padding: '10px 0', textAlign: 'center' }}>
                Keep Editing
              </button>
              <a href="/dashboard/creator" className="ve-header-btn primary" style={{ flex: 1, padding: '10px 0', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Go to Dashboard →
              </a>
            </div>
          </>
        ) : (
          <>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="ve-drawer-title">Publish Campaign</div>
          <button className="ve-drawer-close" onClick={onClose}>×</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.5, margin: 0 }}>
          Choose a URL for your campaign. Once published, it goes live immediately.
        </p>

        <div className="ve-drawer-row">
          <label className="ve-drawer-label">Campaign URL</label>
          <div className="ve-slug-wrap">
            <span className="ve-slug-prefix">valueshare.co/c/</span>
            <input
              className="ve-slug-input"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="my-campaign"
            />
          </div>
          {slugStatus === 'available' && <span className="ve-slug-status ok">✓ Available</span>}
          {slugStatus === 'taken' && <span className="ve-slug-status taken">✗ Already taken — choose another</span>}
          {slugStatus === 'checking' && <span className="ve-slug-status checking">Checking...</span>}
        </div>

        <div style={{ padding: 12, background: 'rgba(232,93,58,0.06)', borderRadius: 10, fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>
          <strong>Before publishing, make sure:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
            <li>Headline and description are filled in</li>
            <li>Destination URL is set</li>
            <li>Reward title and threshold are configured</li>
          </ul>
        </div>

        {error && <div style={{ fontSize: 12, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 }}>{error}</div>}

        <div className="ve-drawer-actions">
          <button
            className="ve-header-btn"
            onClick={onSaveDraft}
            disabled={saving}
            style={{ flex: 1, padding: '10px 0', textAlign: 'center' }}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            className="ve-header-btn primary"
            onClick={doPublish}
            disabled={publishing || slugStatus === 'taken' || !slug}
            style={{ flex: 1, padding: '10px 0', textAlign: 'center' }}
          >
            {publishing ? 'Publishing...' : '🚀 Go Live'}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
