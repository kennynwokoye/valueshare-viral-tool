'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MarketplaceCampaign, CampaignTemplate } from '@/types'
import { formatNumber, formatTimeRemaining, getProgressPercentage } from '@/lib/utils'
import NavAuth from '@/components/NavAuth'
import MobileNav from '@/components/MobileNav'

// ── Template display config ───────────────────────────────────────────
const TEMPLATE_CONFIG: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
  webinar_referral: { label: 'Webinar',       color: '#4f46e5', bg: 'rgba(79,70,229,.1)',   gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
  ebook_giveaway:   { label: 'Ebook',         color: '#d97706', bg: 'rgba(217,119,6,.1)',   gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
  video_content:    { label: 'Video',         color: '#e11d48', bg: 'rgba(225,29,72,.1)',   gradient: 'linear-gradient(135deg,#e11d48,#f43f5e)' },
  whatsapp_share:   { label: 'WhatsApp',      color: '#059669', bg: 'rgba(5,150,105,.1)',   gradient: 'linear-gradient(135deg,#059669,#10b981)' },
  product_launch:   { label: 'Product Launch',color: '#7c3aed', bg: 'rgba(124,58,237,.1)',  gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
}

const TEMPLATE_KEYS = Object.keys(TEMPLATE_CONFIG) as CampaignTemplate[]

type SortOption = 'popular' | 'newest' | 'ending_soon'

// ── Main component ────────────────────────────────────────────────────
export default function MarketplaceClient({ campaigns }: { campaigns: MarketplaceCampaign[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [template, setTemplate] = useState<CampaignTemplate | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('popular')

  const filtered = useMemo(() => {
    let result = [...campaigns]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          (c.creator_name ?? '').toLowerCase().includes(q),
      )
    }

    if (template !== 'all') {
      result = result.filter((c) => c.template === template)
    }

    result.sort((a, b) => {
      if (sort === 'popular') return b.total_participants - a.total_participants
      if (sort === 'newest')
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'ending_soon') {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      return 0
    })

    return result
  }, [campaigns, search, template, sort])

  const totalParticipants = campaigns.reduce((s, c) => s + c.total_participants, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9' }}>
      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="hp-nav">
        <Link href="/" className="hp-logo">
          <div className="hp-logo-ic">◆</div>
          ValueShare
        </Link>
        <div className="nav-c">
          <Link href="/marketplace" style={{ color: 'var(--coral)', fontWeight: 700 }}>Marketplace</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#features">Features</Link>
        </div>
        <MobileNav />
        <NavAuth />
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(180deg,var(--slate2) 0%,transparent 100%)',
          padding: '72px 48px 56px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'var(--coral-light)',
            color: 'var(--coral)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            padding: '4px 14px',
            borderRadius: 100,
            marginBottom: 20,
          }}
        >
          ◆ Campaign Marketplace
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px,5vw,54px)',
            fontWeight: 900,
            letterSpacing: '-.03em',
            color: 'var(--ink)',
            marginBottom: 14,
            lineHeight: 1.1,
          }}
        >
          Discover campaigns.
          <br />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--coral)' }}>
            Share. Earn rewards.
          </span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Browse every live campaign on ValueShare. Join any of them and get your
          unique ValueShare link instantly — no invite needed.
        </p>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { value: campaigns.length.toString(), label: 'Live campaigns' },
            { value: formatNumber(totalParticipants), label: 'Total participants' },
            { value: 'Free', label: 'Always free to join' },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--coral)', letterSpacing: '-.02em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600, marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, height: 36, background: 'var(--border2)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter + Grid ────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Search + sort row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              width="14" height="14" viewBox="0 0 16 16" fill="none"
            >
              <circle cx="6.5" cy="6.5" r="4" stroke="#a8a29e" strokeWidth="1.4" />
              <path d="M11 11l2.5 2.5" stroke="#a8a29e" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search campaigns or creators…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                border: '1.5px solid var(--border2)',
                borderRadius: 10,
                fontSize: 14,
                color: 'var(--ink)',
                background: '#fff',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            style={{
              padding: '11px 14px',
              border: '1.5px solid var(--border2)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            <option value="popular">Most popular</option>
            <option value="newest">Newest first</option>
            <option value="ending_soon">Ending soon</option>
          </select>
        </div>

        {/* Template filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          <button
            onClick={() => setTemplate('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
              border: '1.5px solid',
              borderColor: template === 'all' ? 'var(--coral)' : 'var(--border2)',
              background: template === 'all' ? 'var(--coral-light)' : '#fff',
              color: template === 'all' ? 'var(--coral)' : 'var(--ink3)',
              cursor: 'pointer',
              letterSpacing: '.02em',
            }}
          >
            All
          </button>
          {TEMPLATE_KEYS.map((tk) => {
            const cfg = TEMPLATE_CONFIG[tk]
            const active = template === tk
            return (
              <button
                key={tk}
                onClick={() => setTemplate(active ? 'all' : tk)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 700,
                  border: '1.5px solid',
                  borderColor: active ? cfg.color : 'var(--border2)',
                  background: active ? cfg.bg : '#fff',
                  color: active ? cfg.color : 'var(--ink3)',
                  cursor: 'pointer',
                  letterSpacing: '.02em',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Result count */}
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
          {filtered.length === 0
            ? 'No campaigns found'
            : `${filtered.length} campaign${filtered.length !== 1 ? 's' : ''}`}
          {(search || template !== 'all') && filtered.length > 0 && ' matching your filters'}
        </div>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 32px',
              background: '#fff',
              borderRadius: 16,
              border: '1.5px dashed var(--border2)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {campaigns.length === 0 ? '🚀' : '🔍'}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
              {campaigns.length === 0 ? 'No campaigns listed yet' : 'No campaigns match your search'}
            </div>
            <p style={{ color: 'var(--ink3)', fontSize: 14, marginBottom: 24 }}>
              {campaigns.length === 0
                ? 'Be the first to create and list a campaign on the marketplace.'
                : 'Try different keywords or clear the filters.'}
            </p>
            {campaigns.length === 0 ? (
              <Link href="/auth/signup" className="btn-coral">Create a campaign →</Link>
            ) : (
              <button
                onClick={() => { setSearch(''); setTemplate('all') }}
                className="btn-coral"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))',
              gap: 22,
            }}
          >
            {filtered.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onJoin={() => router.push(`/c/${c.slug}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="hp-footer">
        <div className="f-logo">
          <div className="f-logo-ic">◆</div>
          ValueShare
        </div>
        <div className="f-copy">© 2025 ValueShare. All rights reserved.</div>
      </footer>
    </div>
  )
}

// ── Campaign Card ─────────────────────────────────────────────────────
function CampaignCard({
  campaign: c,
  onJoin,
}: {
  campaign: MarketplaceCampaign
  onJoin: () => void
}) {
  const cfg = c.template && TEMPLATE_CONFIG[c.template]
    ? TEMPLATE_CONFIG[c.template]
    : TEMPLATE_CONFIG.webinar_referral

  const creatorInitial = (c.creator_name ?? 'C').charAt(0).toUpperCase()
  const spotsLeft = c.participant_cap != null ? c.participant_cap - c.total_participants : null
  const progress = c.participant_cap ? getProgressPercentage(c.total_participants, c.participant_cap) : null
  const deadline = c.deadline ? formatTimeRemaining(c.deadline) : null

  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid var(--border2)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,.09)'
        el.style.borderColor = 'var(--coral-border)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
        el.style.borderColor = 'var(--border2)'
      }}
    >
      {/* Hero image or gradient placeholder */}
      <div
        style={{
          height: 148,
          background: c.hero_image_url
            ? `url(${c.hero_image_url}) center/cover no-repeat`
            : cfg.gradient,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Template badge */}
        <span
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(0,0,0,.50)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 100,
            backdropFilter: 'blur(6px)',
            letterSpacing: '.04em',
          }}
        >
          {cfg.label}
        </span>

        {/* Deadline chip */}
        {deadline && (
          <span
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(232,93,58,.92)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 100,
            }}
          >
            ⏰ {deadline}
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '16px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {c.creator_photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={c.creator_photo}
              alt={c.creator_name ?? 'Creator'}
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: cfg.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {creatorInitial}
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600 }}>
            {c.creator_name ?? 'Creator'}
          </span>
        </div>

        {/* Campaign headline */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--ink)',
            lineHeight: 1.3,
            letterSpacing: '-.02em',
          }}
        >
          {c.headline.length > 72 ? c.headline.slice(0, 72) + '…' : c.headline}
        </div>

        {/* Reward teaser */}
        {c.first_tier && (
          <div style={{ fontSize: 13, color: 'var(--ink3)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>🏆</span>
            <span>
              Earn{' '}
              <strong style={{ color: 'var(--ink)' }}>{c.first_tier.reward_label}</strong> for{' '}
              <strong style={{ color: 'var(--ink)' }}>{c.first_tier.threshold}</strong> {c.first_tier.threshold === 1 ? 'share' : 'shares'}
            </span>
          </div>
        )}

        {/* Participant count + spots left */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink3)' }}>
          <span>
            👥 <strong style={{ color: 'var(--ink)' }}>{formatNumber(c.total_participants)}</strong> joined
          </span>
          {spotsLeft !== null && spotsLeft > 0 && (
            <span>
              🪑{' '}
              <strong style={{ color: spotsLeft < 10 ? 'var(--coral)' : 'var(--ink)' }}>
                {spotsLeft}
              </strong>{' '}
              spots left
            </span>
          )}
        </div>

        {/* Progress bar (when participant_cap is set) */}
        {progress !== null && (
          <div>
            <div style={{ height: 5, background: 'var(--slate3)', borderRadius: 100, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: progress + '%',
                  background: cfg.gradient,
                  borderRadius: 100,
                  transition: 'width .6s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTA button */}
        <button
          onClick={onJoin}
          className="btn-coral"
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
        >
          Join &amp; Earn →
        </button>
      </div>
    </div>
  )
}
