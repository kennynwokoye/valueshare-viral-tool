'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCreatorDashboard } from '@/hooks/useCreatorDashboard'
import { formatNumber, getProgressPercentage } from '@/lib/utils'
import type {
  CreatorActivityItem,
  CreatorTopParticipant,
  CampaignWithTiers,
  CreatorDashboardData,
  CreatorParticipant,
  CreatorRewardUnlock,
  FraudFlag,
} from '@/types'
import WidgetBrowser from './WidgetBrowser'
import SettingsPage from './SettingsPage'
import Toast from '@/components/Toast'

type Page = 'overview' | 'campaigns' | 'analytics' | 'participants' | 'rewards' | 'fraud' | 'settings' | 'widgets'

// ── Helpers ──────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function normalizeBarHeights(data: { date: string; clicks: number }[]): { h: number; tip: string; peak?: boolean }[] {
  if (!data.length) return []
  const max = Math.max(...data.map((d) => d.clicks), 1)
  return data.map((d, i) => ({
    h: Math.max(4, Math.round((d.clicks / max) * 100)),
    tip: `${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${d.clicks}`,
    peak: i === data.length - 1,
  }))
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function clickWeekChange(data: { clicks: number }[]): { pct: number; up: boolean } | null {
  if (data.length < 14) return null
  const recent = data.slice(-7).reduce((s, d) => s + d.clicks, 0)
  const prior = data.slice(-14, -7).reduce((s, d) => s + d.clicks, 0)
  if (prior === 0) return null
  const pct = Math.round(((recent - prior) / prior) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

function rewardTypeIcon(type: string | undefined): string {
  if (type === 'video_url') return '🎥'
  if (type === 'call_booking') return '📞'
  if (type === 'file') return '📄'
  return '🎁'
}

function sourceIcon(source: string): string {
  const s = source.toLowerCase()
  if (s === 'whatsapp') return '📱'
  if (s === 'facebook') return '👤'
  if (s === 'instagram') return '📸'
  if (s === 'twitter') return '🐦'
  if (s === 'linkedin') return '💼'
  if (s === 'email') return '📧'
  return '🔗'
}

function sourceColor(source: string): string {
  const s = source.toLowerCase()
  if (s === 'whatsapp') return '#25D366'
  if (s === 'facebook') return '#1877F2'
  if (s === 'instagram') return '#E1306C'
  if (s === 'twitter') return '#1DA1F2'
  if (s === 'linkedin') return '#0A66C2'
  return 'var(--ink3)'
}

function sourceBg(source: string): string {
  const s = source.toLowerCase()
  if (s === 'whatsapp') return '#e8f5e9'
  if (s === 'facebook') return '#e8eaf6'
  if (s === 'instagram') return '#fce4ec'
  if (s === 'twitter') return '#e3f2fd'
  if (s === 'linkedin') return '#e3f0fb'
  return 'var(--slate2)'
}

function anonymizeEmail(email: string): string {
  const prefix = email.split('@')[0] ?? email
  if (prefix.length <= 2) return prefix
  return prefix.charAt(0).toUpperCase() + prefix.charAt(1) + '. ' + prefix.charAt(prefix.length - 1)
}

const RANK_ICONS = ['🥇', '🥈', '🥉']
const AVATAR_COLORS = ['#e85d3a', '#059669', '#7c3aed', '#0284c7', '#db2777', '#d97706', '#6b7280']

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' }, { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }, { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' }, { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'ZAR', name: 'South African Rand' }, { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' }, { code: 'INR', name: 'Indian Rupee' },
  { code: 'XOF', name: 'W. African CFA Franc' }, { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'MAD', name: 'Moroccan Dirham' }, { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UGX', name: 'Ugandan Shilling' }, { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'ETB', name: 'Ethiopian Birr' }, { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'JPY', name: 'Japanese Yen' }, { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'BRL', name: 'Brazilian Real' }, { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ARS', name: 'Argentine Peso' }, { code: 'COP', name: 'Colombian Peso' },
  { code: 'CLP', name: 'Chilean Peso' }, { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'PHP', name: 'Philippine Peso' }, { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'MYR', name: 'Malaysian Ringgit' }, { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' }, { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'PKR', name: 'Pakistani Rupee' }, { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'HKD', name: 'Hong Kong Dollar' }, { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' }, { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' }, { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' }, { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' }, { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' }, { code: 'TRY', name: 'Turkish Lira' },
  { code: 'AED', name: 'UAE Dirham' }, { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' }, { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'ILS', name: 'Israeli Shekel' }, { code: 'UAH', name: 'Ukrainian Hryvnia' },
]

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

// ── Loading Skeleton ──────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="d-card" style={{ height: 120, background: 'var(--slate)', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  )
}

// ── Copy Link Button ──────────────────────────────────────
function CopyLinkBtn({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="cfc-btn sec" onClick={copy} style={{ minWidth: 110 }}>
      {copied ? '✓ Copied!' : '🔗 Copy link'}
    </button>
  )
}

// ── Campaign QR Code Button ────────────────────────────────
function CampaignQrBtn({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  function handleOpen() {
    setOpen(true)
    if (!qrDataUrl) {
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(`${window.location.origin}/c/${slug}`, { width: 240, margin: 2 })
          .then(setQrDataUrl)
          .catch(() => {})
      }).catch(() => {})
    }
  }

  return (
    <>
      <button className="cfc-btn sec" onClick={handleOpen}>QR Code</button>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: 'var(--vs-bg)', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>Campaign QR Code</div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
              Share this QR code to drive traffic to your campaign landing page.
            </div>
            {qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Campaign QR Code" width={200} height={200} style={{ borderRadius: 8 }} />
                <button
                  className="cfc-btn primary"
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = qrDataUrl
                    a.download = `valueshare-campaign-qr-${slug}.png`
                    a.click()
                  }}
                >
                  ⬇ Download QR Code
                </button>
              </>
            ) : (
              <div style={{ width: 200, height: 200, background: 'var(--slate)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--ink3)' }}>
                Generating…
              </div>
            )}
            <button
              className="cfc-btn sec"
              onClick={() => setOpen(false)}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function CreatorDashboardPage() {
  const searchParams = useSearchParams()
  const [activePage, setActivePage] = useState<Page>('overview')
  const { data, campaigns, loading, error, refresh, rewardUnlockToast, clearRewardUnlockToast } = useCreatorDashboard()

  // Sync activePage with ?tab= URL param (reacts to router.push from header dropdown)
  useEffect(() => {
    const tab = searchParams.get('tab') as Page | null
    const valid: Page[] = ['overview', 'campaigns', 'analytics', 'participants', 'rewards', 'fraud', 'settings', 'widgets']
    if (tab && valid.includes(tab)) setActivePage(tab)
    else setActivePage('overview')
  }, [searchParams])

  // Wire sidebar click delegation for within-dashboard navigation
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.sb-item') as HTMLElement | null
      if (!btn) return
      const page = btn.dataset.page as Page | undefined
      if (page) setActivePage(page)
    }
    sidebar.addEventListener('click', handler)
    return () => sidebar.removeEventListener('click', handler)
  }, [])

  // Update active class on sidebar items
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    sidebar.querySelectorAll('.sb-item').forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.classList.toggle('active', htmlEl.dataset.page === activePage)
    })
  }, [activePage])

  if (loading) return <LoadingSkeleton />
  if (error) return (
    <div className="d-card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Failed to load dashboard</div>
      <div style={{ fontSize: 13, marginBottom: 16 }}>{error}</div>
      <button className="btn-new" onClick={refresh}>Try again</button>
    </div>
  )

  return (
    <>
      {activePage === 'overview' && (
        <OverviewPage data={data} campaigns={campaigns} onNavigate={setActivePage} />
      )}
      {activePage === 'campaigns' && <CampaignsPage campaigns={campaigns} onRefresh={refresh} />}
      {activePage === 'analytics' && <AnalyticsPage data={data} campaigns={campaigns} />}
      {activePage === 'participants' && <ParticipantsPage data={data} />}
      {activePage === 'rewards' && <RewardsPage data={data} />}
      {activePage === 'fraud' && <FraudPage data={data} />}
      {activePage === 'settings' && <SettingsPage />}
      {activePage === 'widgets' && <WidgetBrowser campaign={campaigns[0] ?? null} onClose={() => setActivePage('overview')} />}

      {rewardUnlockToast && (
        <Toast
          message={rewardUnlockToast}
          type="success"
          icon="🎉"
          duration={5000}
          onDismiss={clearRewardUnlockToast}
        />
      )}
    </>
  )
}

/* ═══════════════════════════════════════════
   OVERVIEW PAGE
   ═══════════════════════════════════════════ */
function OverviewPage({
  data,
  campaigns,
  onNavigate,
}: {
  data: CreatorDashboardData | null
  campaigns: CampaignWithTiers[]
  onNavigate: (p: Page) => void
}) {
  const router = useRouter()
  const agg = data?.aggregate
  const topCamp = data?.top_campaign

  const bars7 = normalizeBarHeights(data?.clicks_per_day_7 ?? [])
  const dayLabels7 = (data?.clicks_per_day_7 ?? []).map((d) => formatDayLabel(d.date))

  const viralCoeff = agg?.viral_coefficient ?? 0
  // Map 0–3 range to 0–100% of the gauge circumference (201 ≈ 2πr for r=32)
  const gaugeOffset = Math.max(0, 201 - (Math.min(viralCoeff, 3) / 3) * 201)

  const weekChange = clickWeekChange(data?.clicks_per_day_30 ?? [])
  const fraudTotal = data?.fraud_summary?.total ?? 0
  const activeCamps = campaigns.filter((c) => c.status === 'active').slice(0, 2)

  const activity = data?.recent_activity ?? []

  const rewardsDelivered = agg?.rewards_delivered ?? 0

  // ── Smart Banner: detect lifecycle state ──
  function getSmartBanner() {
    const totalCampaigns = campaigns.length
    const drafts = campaigns.filter(c => c.status === 'draft')
    const activeCount = agg?.active_campaigns ?? 0
    const clicks = agg?.total_clicks ?? 0
    const participants = agg?.total_participants ?? 0
    const viral = agg?.viral_coefficient ?? 0
    const rewards = agg?.rewards_delivered ?? 0
    const last7Clicks = (data?.clicks_per_day_7 ?? []).reduce((s, d) => s + d.clicks, 0)
    const firstActive = campaigns.find(c => c.status === 'active')

    // State 1: Brand new — no campaigns at all
    if (totalCampaigns === 0) {
      return {
        eyebrow: 'Getting started',
        title: <>Launch your <span>first campaign</span></>,
        sub: 'Set up a referral campaign in minutes and start growing with zero ad spend.',
        right: 'cta' as const,
        ctaLabel: '+ Create campaign',
        ctaAction: () => router.push('/dashboard/creator/campaigns/new'),
      }
    }

    // State 2: Drafts only — has drafts but nothing live
    if (activeCount === 0 && drafts.length > 0) {
      return {
        eyebrow: 'Almost there',
        title: <>Your draft is <span>waiting</span></>,
        sub: <><strong>{drafts[0].name}</strong> is almost ready to go live. Pick up where you left off.</>,
        right: 'cta' as const,
        ctaLabel: 'Continue setup →',
        ctaAction: () => router.push(`/dashboard/creator/campaigns/new?edit=${drafts[0].id}`),
      }
    }

    // State 3: Just launched — active but zero engagement
    if (activeCount > 0 && clicks === 0 && participants === 0) {
      return {
        eyebrow: 'Campaign is live',
        title: <>Now <span>share the link</span></>,
        sub: <><strong>{firstActive?.name}</strong> is live and ready. Share it to start driving referral traffic.</>,
        right: 'cta' as const,
        ctaLabel: 'View campaign →',
        ctaAction: () => window.open(`/c/${firstActive?.slug}`, '_blank'),
      }
    }

    // State 3b: Participants joined but no clicks yet
    if (activeCount > 0 && clicks === 0 && participants > 0) {
      return {
        eyebrow: 'Building momentum',
        title: <>{participants === 1 ? 'First participant' : `${participants} participants`} <span>joined!</span></>,
        sub: <>{participants === 1 ? 'Someone' : formatNumber(participants) + ' people'} signed up{firstActive ? <> for <strong>{firstActive.name}</strong></> : ''}. Share your link to start driving clicks.</>,
        right: 'metric' as const,
        metricValue: String(participants),
        metricLabel: `participant${participants !== 1 ? 's' : ''} joined`,
        badgeText: `${activeCount} campaign${activeCount !== 1 ? 's' : ''} live`,
      }
    }

    // State 4: Stalled — has history but zero clicks in last 7 days
    if (activeCount > 0 && clicks > 0 && last7Clicks === 0) {
      return {
        eyebrow: 'Time to act',
        title: <>Growth has <span>slowed down</span></>,
        sub: 'No new clicks this week. Share your campaign link again or try a new channel.',
        right: 'cta' as const,
        ctaLabel: 'View campaigns →',
        ctaAction: () => onNavigate('campaigns'),
      }
    }

    // State 5: First traction — early clicks
    if (clicks > 0 && clicks <= 50 && participants < 5) {
      return {
        eyebrow: 'Early traction',
        title: <>First clicks are <span>coming in</span></>,
        sub: <>{formatNumber(clicks)} clicks so far{topCamp ? <> on <strong>{topCamp.name}</strong></> : ''}. Keep sharing to build momentum.</>,
        right: 'metric' as const,
        metricValue: formatNumber(clicks),
        metricLabel: 'clicks so far',
        badgeText: `${participants} joined`,
      }
    }

    // State 6: Going viral — viral coefficient >= 2
    if (viral >= 2) {
      return {
        eyebrow: 'Viral growth',
        title: <>Your campaigns are <span>going viral</span></>,
        sub: <>{viral.toFixed(1)}x viral coefficient — each participant brings {viral.toFixed(1)} more.{topCamp ? <> <strong>{topCamp.name}</strong> leads with {formatNumber(topCamp.total_clicks)} clicks.</> : ''}</>,
        right: 'metric' as const,
        metricValue: `${viral.toFixed(1)}×`,
        metricLabel: 'viral coefficient',
        badgeText: `${formatNumber(clicks)} clicks`,
      }
    }

    // State 7: Growing — solid traction
    if (clicks > 50) {
      const changeText = weekChange
        ? `${weekChange.up ? '↑' : '↓'} ${weekChange.pct}% vs last week.`
        : ''
      return {
        eyebrow: 'Growth mode',
        title: <>Campaigns are <span>gaining momentum</span></>,
        sub: <>{topCamp ? <><strong>{topCamp.name}</strong> leads with {formatNumber(topCamp.total_clicks)} clicks. </> : ''}{changeText}{rewards > 0 ? ` ${formatNumber(rewards)} rewards auto-delivered.` : ''}</>,
        right: 'metric' as const,
        metricValue: formatNumber(clicks),
        metricLabel: 'Total clicks this month',
        badgeText: `${activeCount} campaign${activeCount !== 1 ? 's' : ''} live`,
      }
    }

    // State 8: Fallback — existing behavior
    return {
      eyebrow: 'Your growth engine',
      title: <>Campaigns are <span>working hard</span></>,
      sub: topCamp
        ? <>Your <strong>{topCamp.name}</strong> campaign is your top performer this week.<br />{formatNumber(topCamp.total_clicks)} clicks and counting.</>
        : <>Create your first campaign to start tracking growth.</>,
      right: 'metric' as const,
      metricValue: formatNumber(clicks),
      metricLabel: 'Total clicks this month',
      badgeText: `${activeCount} campaign${activeCount !== 1 ? 's' : ''} live`,
    }
  }

  const banner = getSmartBanner()

  return (
    <>
      {/* Smart Welcome Banner */}
      <div className="welcome-banner">
        <div className="wb-glow" /><div className="wb-glow2" />
        <div className="wb-left">
          <div className="wb-eyebrow">{banner.eyebrow}</div>
          <div className="wb-title">{banner.title}</div>
          <div className="wb-sub">{banner.sub}</div>
        </div>
        <div className="wb-right">
          {banner.right === 'cta' ? (
            <button className="btn-new" style={{ fontSize: 14, padding: '12px 24px' }} onClick={banner.ctaAction}>
              {banner.ctaLabel}
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'right' }}>
                <div className="wb-sv">{banner.metricValue}</div>
                <div className="wb-sl">{banner.metricLabel}</div>
              </div>
              <div className="wb-badge">
                <div className="live-dot" />
                {banner.badgeText}
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-glow" style={{ background: 'var(--coral)' }} />
          <div className="kpi-eyebrow">Total clicks</div>
          <div className="kpi-value">{formatNumber(agg?.total_clicks ?? 0)}</div>
          {weekChange ? (
            <div className={`kpi-change ${weekChange.up ? 'up' : 'down'}`}>
              {weekChange.up ? '↑' : '↓'} {weekChange.up ? '+' : '-'}{weekChange.pct}% this week
            </div>
          ) : (
            <div className="kpi-change up">↑ Growing</div>
          )}
          <div className="kpi-sub">All campaigns combined</div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: 'var(--emerald)' }} />
          <div className="kpi-eyebrow">Participants</div>
          <div className="kpi-value">{formatNumber(agg?.total_participants ?? 0)}</div>
          <div className="kpi-change up">↑ Active</div>
          <div className="kpi-sub">
            Across {agg?.active_campaigns ?? 0} active campaign{(agg?.active_campaigns ?? 0) !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: '#f59e0b' }} />
          <div className="kpi-eyebrow">Viral coefficient</div>
          <div className="kpi-value">{viralCoeff.toFixed(1)}<span className="kpi-unit">×</span></div>
          <div className={`kpi-change ${viralCoeff >= 2 ? 'up' : ''}`}>
            {viralCoeff >= 3 ? '🔥 Viral' : viralCoeff >= 2 ? '↑ Excellent' : viralCoeff >= 1 ? '↑ Good' : 'Growing'}
          </div>
          <div className="kpi-sub">Industry avg. 1.3×</div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: '#7c3aed' }} />
          <div className="kpi-eyebrow">Rewards delivered</div>
          <div className="kpi-value">{formatNumber(rewardsDelivered)}</div>
          <div className="kpi-change up">↑ Auto-delivered</div>
          <div className="kpi-sub">$0 manual work</div>
        </div>
      </div>

      {/* Fraud alert — only show when there are fraud flags */}
      {fraudTotal > 0 && (
        <div className="fraud-alert">
          <div className="fa-ico">⚠️</div>
          <div>
            <div className="fa-t">{fraudTotal} suspicious click{fraudTotal > 1 ? 's' : ''} flagged across your campaigns</div>
            <div className="fa-s">Clicks withheld from participant counts and reward calculations.</div>
          </div>
          <button className="fa-action" onClick={() => onNavigate('fraud')}>Review →</button>
        </div>
      )}

      {/* Chart + Viral Gauge */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="d-card">
          <div className="d-card-hd">
            <div>
              <div className="d-card-title">Click performance</div>
              <div className="d-card-sub">Total verified clicks across all campaigns</div>
            </div>
            <div className="bc-tabs">
              <button className="bc-tab bc-active">7D</button>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="chart-bars">
              {bars7.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--ink3)', paddingTop: 32 }}>No clicks yet</div>
              ) : bars7.map((bar, i) => (
                <div key={i} className={`cb${bar.peak ? ' peak' : ''}`} style={{ height: bar.h + '%' }}>
                  <div className="cb-tip">{bar.tip}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-labels">
            {dayLabels7.slice(0, -1).map((d, i) => <div key={i} className="cl">{d}</div>)}
            <div className="cl" style={{ color: 'var(--coral)', fontWeight: 700 }}>Today</div>
          </div>
        </div>

        <div className="d-card">
          <div className="d-card-hd">
            <div><div className="d-card-title">Viral coefficient</div><div className="d-card-sub">Clicks per participant</div></div>
          </div>
          <div className="viral-gauge">
            <div className="gauge-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--slate2)" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--coral)" strokeWidth="8"
                  strokeDasharray="201" strokeDashoffset={gaugeOffset} strokeLinecap="round" />
              </svg>
              <div className="gauge-center">
                <div className="gauge-val">{viralCoeff.toFixed(1)}</div>
                <div className="gauge-lbl">coeff.</div>
              </div>
            </div>
            <div className="gauge-info">
              <div className="gi-t">
                {viralCoeff >= 3 ? '🔥 Viral!' : viralCoeff >= 2 ? '⭐ Excellent' : viralCoeff >= 1 ? '✓ Good' : '📈 Growing'}
              </div>
              <div className="gi-s">
                Each participant drives<br />{viralCoeff.toFixed(1)} new participants on average.
              </div>
            </div>
          </div>
          <div style={{ padding: '0 22px 16px' }}>
            <div className="viral-scale">
              {[
                { range: '0–1×', label: 'Poor', active: viralCoeff < 1, style: { background: 'var(--slate2)', color: 'var(--ink3)' } },
                { range: '1–2×', label: 'Good', active: viralCoeff >= 1 && viralCoeff < 2, style: { background: 'rgba(217,119,6,.08)', color: '#d97706' } },
                { range: '2–3×', label: '⭐ You', active: viralCoeff >= 2 && viralCoeff < 3, style: { background: 'var(--coral-light)', color: 'var(--coral-dark)', border: '1.5px solid var(--coral-border)' } },
                { range: '3×+', label: 'Viral', active: viralCoeff >= 3, style: { background: 'var(--emerald-bg)', color: 'var(--emerald)' } },
              ].map((s) => (
                <div key={s.range} className="vs-item" style={{
                  ...s.style,
                  ...(s.active ? { fontWeight: 700 } : { opacity: 0.6 }),
                }}>
                  {s.range}<br /><span style={{ fontSize: 9 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="d-card-hd" style={{ marginTop: 0, borderTop: '1px solid var(--border)' }}>
            <div><div className="d-card-title">Active campaigns</div></div>
            <button className="sec-action" onClick={() => onNavigate('campaigns')}>View all →</button>
          </div>
          <div className="camp-grid">
            {activeCamps.length === 0 ? (
              <div style={{ padding: '16px 22px', fontSize: 13, color: 'var(--ink3)' }}>No active campaigns yet.</div>
            ) : activeCamps.map((c) => {
              const firstTier = c.reward_tiers?.[0]
              const goal = firstTier ? firstTier.threshold * Math.max(c.total_participants, 1) : null
              const pct = goal ? getProgressPercentage(c.total_clicks, goal) : null
              return (
                <div key={c.id} className="camp-card active-camp">
                  <div className="camp-status-dot live" />
                  <div className="camp-name">{c.name}</div>
                  <div className="camp-type">
                    {firstTier ? `${firstTier.threshold} clicks → ${firstTier.reward_label}` : 'No reward configured'}
                  </div>
                  {pct !== null && (
                    <>
                      <div className="camp-prog-bar"><div className="camp-prog-fill" style={{ width: pct + '%' }} /></div>
                      <div className="camp-prog-row">
                        <div className="camp-prog-txt">{c.total_clicks} clicks</div>
                        <div className="camp-prog-pct">{pct}%</div>
                      </div>
                    </>
                  )}
                  <div className="camp-footer">
                    <div className="camp-stat"><strong>{c.total_participants}</strong> participants</div>
                    <div className="chip chip-green">● Live</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Performers + Live Feed */}
      <div className="two-col">
        <div className="d-card">
          <div className="d-card-hd">
            <div><div className="d-card-title">Top performers</div><div className="d-card-sub">Ranked by verified clicks</div></div>
          </div>
          {(data?.top_participants ?? []).length === 0 ? (
            <div style={{ padding: '24px 22px', fontSize: 13, color: 'var(--ink3)' }}>No participants yet.</div>
          ) : (
            <>
              <div className="plist-hd">
                <div className="ph">#</div>
                <div className="ph">Participant</div>
                <div className="ph">Clicks</div>
                <div className="ph">Campaign</div>
                <div className="ph">Status</div>
              </div>
              <div className="plist">
                {(data?.top_participants ?? []).map((p: CreatorTopParticipant, i: number) => (
                  <div key={i} className="prow">
                    <div className="pr-rank">{RANK_ICONS[i] ?? String(i + 1)}</div>
                    <div className="pr-info">
                      <div className="pr-av" style={{ background: avatarColor(i) }}>{p.initial}</div>
                      <div><div className="pr-name">{p.display_name}</div></div>
                    </div>
                    <div className="pr-clicks">{p.click_count}</div>
                    <div className="pr-reward" style={{ fontSize: 12 }}>{p.campaign_name}</div>
                    <div className={`pr-status ${p.is_goal_reached ? 'earned' : 'progress'}`}>
                      <div className="sd" />{p.is_goal_reached ? 'Earned' : 'In progress'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="d-card">
            <div className="d-card-hd">
              <div><div className="d-card-title">Live activity</div></div>
              <div className="chip chip-green">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--emerald)', animation: 'lpulse 1.4s ease infinite' }} />
                Live
              </div>
            </div>
            <div className="feed-list">
              {activity.length === 0 ? (
                <div style={{ padding: '16px 22px', fontSize: 13, color: 'var(--ink3)' }}>No activity yet.</div>
              ) : activity.slice(0, 5).map((item: CreatorActivityItem, i: number) => (
                <div key={i} className="feed-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="fi-av" style={{ background: item.type === 'reward' ? '#7c3aed' : '#e85d3a' }}>
                    {item.initial}
                  </div>
                  <div className="fi-body">
                    <div className="fi-text">
                      <strong>{item.display_name}</strong> {item.detail}
                    </div>
                    <div className="fi-time">{timeAgo(item.created_at)} · {item.campaign_name}</div>
                  </div>
                  <div className={`fi-badge chip ${item.type === 'reward' ? 'chip-green' : 'chip-coral'}`}>
                    {item.type === 'reward' ? '🏆' : 'New'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="d-card">
            <div className="d-card-hd"><div className="d-card-title">Quick actions</div></div>
            <div className="qa-grid">
              {[
                { icon: '🎯', bg: 'var(--coral-light)', label: 'New campaign', sub: 'Launch in minutes', onClick: () => router.push('/dashboard/creator/campaigns/new') },
                { icon: '📊', bg: 'rgba(37,99,235,.08)', label: 'View analytics', sub: 'Full breakdown', onClick: () => onNavigate('analytics') },
                { icon: '🏆', bg: 'rgba(217,119,6,.08)', label: 'Rewards log', sub: `${formatNumber(rewardsDelivered)} delivered`, onClick: () => onNavigate('rewards') },
                { icon: '🛡️', bg: 'rgba(220,38,38,.06)', label: 'Fraud Shield', sub: fraudTotal > 0 ? `${fraudTotal} flagged` : 'All clear', onClick: () => onNavigate('fraud') },
              ].map((qa) => (
                <div key={qa.label} className="qa-item" style={{ cursor: 'pointer' }} onClick={qa.onClick}>
                  <div className="qa-ico" style={{ background: qa.bg }}>{qa.icon}</div>
                  <div><div className="qa-lbl">{qa.label}</div><div className="qa-sub">{qa.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   CAMPAIGNS PAGE
   ═══════════════════════════════════════════ */
function CampaignsPage({ campaigns, onRefresh }: { campaigns: CampaignWithTiers[]; onRefresh: () => void }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [marketplaceListed, setMarketplaceListed] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [widgetCampaign, setWidgetCampaign] = useState<CampaignWithTiers | null>(null)
  const [costLeadCampaignId, setCostLeadCampaignId] = useState<string | null>(null)
  const [costLeadAmount, setCostLeadAmount] = useState('')
  const [costLeadCurrency, setCostLeadCurrency] = useState('USD')
  const [savingCostLead, setSavingCostLead] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState<Record<string, boolean>>({})
  const [webhookSecrets, setWebhookSecrets] = useState<Record<string, string>>({})
  const [secretCopied, setSecretCopied] = useState<Record<string, boolean>>({})
  const [snippetCopied, setSnippetCopied] = useState<Record<string, boolean>>({})

  async function fetchWebhookSecret(campId: string) {
    if (webhookSecrets[campId]) return
    try {
      const res = await fetch(`/api/campaigns/${campId}/webhook-secret`)
      if (res.ok) {
        const { secret } = await res.json()
        setWebhookSecrets((prev) => ({ ...prev, [campId]: secret }))
      }
    } catch { /* ignore */ }
  }

  function toggleTracking(campId: string) {
    const next = !trackingOpen[campId]
    setTrackingOpen((prev) => ({ ...prev, [campId]: next }))
    if (next) fetchWebhookSecret(campId)
  }

  function copySnippet(campId: string) {
    const snippet = `<script src="https://valueshare.co/pixel.js"></script>`
    navigator.clipboard.writeText(snippet)
    setSnippetCopied((prev) => ({ ...prev, [campId]: true }))
    setTimeout(() => setSnippetCopied((prev) => ({ ...prev, [campId]: false })), 2000)
  }

  function copySecret(campId: string) {
    const secret = webhookSecrets[campId]
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setSecretCopied((prev) => ({ ...prev, [campId]: true }))
    setTimeout(() => setSecretCopied((prev) => ({ ...prev, [campId]: false })), 2000)
  }

  async function handleMarketplaceToggle(camp: CampaignWithTiers) {
    const current = marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false
    const next = !current
    setMarketplaceListed((prev) => ({ ...prev, [camp.id]: next }))
    setToggling((prev) => ({ ...prev, [camp.id]: true }))
    try {
      const res = await fetch(`/api/campaigns/${camp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace_listed: next }),
      })
      if (!res.ok) {
        setMarketplaceListed((prev) => ({ ...prev, [camp.id]: current }))
      } else {
        onRefresh()
      }
    } catch {
      setMarketplaceListed((prev) => ({ ...prev, [camp.id]: current }))
    } finally {
      setToggling((prev) => ({ ...prev, [camp.id]: false }))
    }
  }

  async function handleSaveCostLead() {
    if (!costLeadCampaignId) return
    const amount = parseFloat(costLeadAmount)
    if (isNaN(amount) || amount < 0) return
    setSavingCostLead(true)
    try {
      const res = await fetch(`/api/campaigns/${costLeadCampaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost_per_lead: amount > 0 ? amount : null,
          cost_per_lead_currency: costLeadCurrency,
        }),
      })
      if (res.ok) {
        setCostLeadCampaignId(null)
        setCostLeadAmount('')
        onRefresh()
      }
    } finally {
      setSavingCostLead(false)
    }
  }

  const filtered = filter === 'all'
    ? campaigns
    : campaigns.filter((c) => {
      if (filter === 'live') return c.status === 'active'
      if (filter === 'draft') return c.status === 'draft'
      if (filter === 'done') return c.status === 'ended'
      if (filter === 'paused') return c.status === 'paused'
      return true
    })

  const liveCount = campaigns.filter((c) => c.status === 'active').length
  const pausedCount = campaigns.filter((c) => c.status === 'paused').length
  const draftCount = campaigns.filter((c) => c.status === 'draft').length
  const endedCount = campaigns.filter((c) => c.status === 'ended').length

  function campaignStatusIcon(c: CampaignWithTiers) {
    if (c.status === 'active') return <><div className="sd" />Live</>
    if (c.status === 'paused') return <>⏸ Paused</>
    if (c.status === 'ended') return <>Completed</>
    return <>Draft</>
  }

  return (
    <>
      <div className="camps-header">
        <div>
          <div className="camps-title">Your <span>Campaigns</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>
            {liveCount} active · {pausedCount} paused · {draftCount} draft · {endedCount} completed
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="camps-filters">
            {[
              { key: 'all', label: 'All' },
              { key: 'live', label: 'Live' },
              { key: 'paused', label: 'Paused' },
              { key: 'draft', label: 'Draft' },
              { key: 'done', label: 'Completed' },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-pill${filter === f.key ? ' fp-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn-new" onClick={() => router.push('/dashboard/creator/campaigns/new')}>+ New campaign</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="d-card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No campaigns here</div>
          <button className="btn-new" onClick={() => router.push('/dashboard/creator/campaigns/new')}>+ Create campaign</button>
        </div>
      ) : (
        <div className="camp-full-list">
          {filtered.map((camp) => {
            const firstTier = camp.reward_tiers?.[0]
            const viral = camp.total_participants > 0
              ? (camp.total_clicks / camp.total_participants).toFixed(1)
              : '0.0'
            const goal = firstTier ? firstTier.threshold * Math.max(camp.total_participants, 1) : null
            const prog = goal ? getProgressPercentage(camp.total_clicks, goal) : null
            const isDraft = camp.status === 'draft'
            const costLead = camp.cost_per_lead ?? null
            const campCurrency = camp.cost_per_lead_currency || 'USD'
            const savings = costLead != null && camp.total_participants > 0
              ? costLead * camp.total_participants
              : null
            const savingsStr = savings != null
              ? (() => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: campCurrency, maximumFractionDigits: 0 }).format(savings) } catch { return savings.toLocaleString() } })()
              : null

            return (
              <div key={camp.id} className="camp-full-card" style={isDraft ? { opacity: 0.7 } : undefined}>
                <div className="cfc-top">
                  <div className="cfc-ico" style={isDraft ? { background: 'var(--slate2)', borderColor: 'var(--border2)' } : undefined}>
                    🎯
                  </div>
                  <div className="cfc-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="cfc-name">{camp.name}</div>
                      <div className={`cfc-status ${camp.status === 'active' ? 'live' : camp.status}`}>
                        {campaignStatusIcon(camp)}
                      </div>
                    </div>
                    <div className="cfc-meta">
                      <div className="cfc-type">
                        {firstTier
                          ? `Goal: ${firstTier.threshold} ${camp.kpi_type === 'clicks' ? 'clicks' : camp.kpi_type === 'registrations' ? 'sign-ups' : camp.kpi_type === 'purchases' ? 'purchases' : camp.kpi_type === 'shares' ? 'shares' : 'clicks'} per participant → ${firstTier.reward_label}`
                          : isDraft ? 'Goal not set · Reward not configured' : 'No reward configured'}
                      </div>
                      {camp.destination_url && (
                        <div className="chip chip-coral">Destination: {camp.destination_url.replace(/^https?:\/\//, '').split('/')[0]}</div>
                      )}
                    </div>
                  </div>
                  <div className="cfc-btn-stack">
                    <div className="cfc-actions">
                      {isDraft ? (
                        <>
                          <button className="cfc-btn primary" onClick={() => router.push(`/dashboard/creator/campaigns/new?edit=${camp.id}`)}>
                            Continue setup →
                          </button>
                          <button className="cfc-btn sec" onClick={async () => {
                            if (!confirm('Delete this draft campaign?')) return
                            await fetch(`/api/campaigns/${camp.id}`, { method: 'DELETE' })
                            onRefresh()
                          }}>
                            🗑 Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="cfc-btn sec" onClick={() => router.push(`/dashboard/creator/campaigns/new?edit=${camp.id}`)}>
                            ✏️ Edit
                          </button>
                          {camp.status === 'active' && (
                            <button className="cfc-btn sec" onClick={async () => {
                              await fetch(`/api/campaigns/${camp.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'paused' }),
                              })
                              onRefresh()
                            }}>
                              ⏸ Pause
                            </button>
                          )}
                          {camp.status === 'paused' && (
                            <button className="cfc-btn sec" onClick={async () => {
                              await fetch(`/api/campaigns/${camp.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'active' }),
                              })
                              onRefresh()
                            }}>
                              ▶ Resume
                            </button>
                          )}
                          <button className="cfc-btn primary" onClick={() => window.open(`/c/${camp.slug}`, '_blank')}>
                            View campaign →
                          </button>
                        </>
                      )}
                    </div>
                    {/* Secondary tools row — aligned below primary actions */}
                    {!isDraft && (
                      <div className="cfc-tools">
                        <button className="cfc-btn sec" onClick={() => setWidgetCampaign(camp)}>🧩 Browse Widgets</button>
                        <CopyLinkBtn slug={camp.slug} />
                        <CampaignQrBtn slug={camp.slug} />
                      </div>
                    )}
                  </div>
                </div>
                {!isDraft && (
                  <div style={{ padding: '0 24px 20px' }}>
                    <div className="cfc-stats">
                      {[
                        { v: formatNumber(camp.total_clicks), l: 'Total clicks' },
                        { v: formatNumber(camp.total_participants), l: 'Participants' },
                        { v: `${viral}×`, l: 'Viral coeff.' },
                      ].map((s) => (
                        <div key={s.l} className="cfc-stat">
                          <div className="cfc-sv">{s.v}</div>
                          <div className="cfc-sl">{s.l}</div>
                        </div>
                      ))}
                      <div
                        className="cfc-stat"
                        title="Click to set your cost per lead and calculate savings"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setCostLeadCampaignId(camp.id)
                          setCostLeadAmount(costLead != null ? String(costLead) : '')
                          setCostLeadCurrency(campCurrency)
                        }}
                      >
                        <div className="cfc-sv" style={{ color: savingsStr ? 'var(--emerald)' : 'var(--ink3)' }}>
                          {savingsStr ?? '✏️ Set'}
                        </div>
                        <div className="cfc-sl">Ad spend saved</div>
                        <div className="cfc-sc">{savingsStr ? '↓ Saved vs paid ads' : 'Enter cost/lead →'}</div>
                      </div>
                      {prog !== null && (
                        <div className="cfc-prog-wrap" style={{ minWidth: 180 }}>
                          <div className="cfc-prog-lbl">
                            <span className="cfc-pl">Progress to goal</span>
                            <span className="cfc-pr">{prog}%</span>
                          </div>
                          <div className="cfc-prog-bar">
                            <div className="cfc-prog-fill" style={{ width: prog + '%' }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 5 }}>
                            {camp.total_clicks} / {goal} clicks
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Conversion tracking setup panel — only for non-click campaigns */}
                {!isDraft && camp.kpi_type !== 'clicks' && (
                  <div style={{ borderTop: '1px solid var(--border2)' }}>
                    <button
                      onClick={() => toggleTracking(camp.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk',sans-serif" }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>📡</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Conversion Tracking Setup</span>
                        <span style={{ fontSize: 11, color: 'var(--coral)', fontWeight: 700, background: 'var(--coral-light)', padding: '1px 7px', borderRadius: 20 }}>Required</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{trackingOpen[camp.id] ? '▲ Hide' : '▼ Show'}</span>
                    </button>
                    {trackingOpen[camp.id] && (
                      <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.5 }}>
                          Since your goal is <strong>{camp.kpi_type === 'registrations' ? 'sign-ups' : camp.kpi_type}</strong>, you need to install tracking on your thank-you page so ValueShare can verify conversions.
                        </div>
                        {/* Pixel snippet */}
                        <div style={{ background: 'var(--slate)', border: '1.5px solid var(--border2)', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Option 1 — JS Pixel (easiest)</div>
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 10 }}>Paste this on your <strong>thank-you / confirmation page</strong>. Works on Webflow, WordPress, Carrd, any HTML site.</div>
                          <div style={{ background: '#1a1a2e', borderRadius: 7, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', wordBreak: 'break-all', marginBottom: 10 }}>
                            {`<script src="https://valueshare.co/pixel.js"></script>`}
                          </div>
                          <button
                            className="cfc-btn sec"
                            onClick={() => copySnippet(camp.id)}
                            style={{ fontSize: 12 }}
                          >
                            {snippetCopied[camp.id] ? '✓ Copied!' : '📋 Copy snippet'}
                          </button>
                        </div>
                        {/* Webhook */}
                        <div style={{ background: 'var(--slate)', border: '1.5px solid var(--border2)', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Option 2 — Server Webhook</div>
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 10 }}>
                            POST to <code style={{ background: 'var(--slate2)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>https://valueshare.co/api/conversion</code> from your backend or a Zapier/Make.com workflow when a sign-up happens.
                          </div>
                          <div style={{ background: '#1a1a2e', borderRadius: 7, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#a5f3fc', whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                            {`POST /api/conversion\n{\n  "ref_code": "<participant_ref>",\n  "event": "signup",\n  "secret": "${webhookSecrets[camp.id] || '(loading...)'}"\n}`}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="cfc-btn sec"
                              onClick={() => copySecret(camp.id)}
                              style={{ fontSize: 12 }}
                            >
                              {secretCopied[camp.id] ? '✓ Copied!' : '🔑 Copy secret'}
                            </button>
                            <button
                              className="cfc-btn sec"
                              onClick={async () => {
                                const res = await fetch(`/api/campaigns/${camp.id}/webhook-secret`, { method: 'DELETE' })
                                if (res.ok) {
                                  const { secret } = await res.json()
                                  setWebhookSecrets((prev) => ({ ...prev, [camp.id]: secret }))
                                }
                              }}
                              style={{ fontSize: 12 }}
                            >
                              🔄 Rotate secret
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Marketplace toggle — shown for all non-draft campaigns */}
                {!isDraft && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 24px',
                      borderTop: '1px solid var(--border2)',
                      background: 'var(--slate2)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                        List on Marketplace
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                        {camp.status !== 'active'
                          ? 'Activate campaign to enable'
                          : 'Visible to all visitors on /marketplace'}
                      </div>
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: camp.status === 'active' ? 'pointer' : 'not-allowed',
                        opacity: toggling[camp.id] ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false}
                        disabled={camp.status !== 'active' || toggling[camp.id]}
                        onChange={() => handleMarketplaceToggle(camp)}
                        style={{ display: 'none' }}
                      />
                      {/* Toggle track */}
                      <div
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 100,
                          background: (marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false)
                            ? 'var(--emerald)'
                            : 'var(--slate3)',
                          position: 'relative',
                          transition: 'background .2s',
                          opacity: camp.status !== 'active' ? 0.4 : 1,
                          flexShrink: 0,
                        }}
                      >
                        {/* Toggle thumb */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: (marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false) ? 18 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                            transition: 'left .2s',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: (marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false)
                            ? 'var(--emerald)'
                            : 'var(--ink3)',
                          minWidth: 64,
                        }}
                      >
                        {toggling[camp.id]
                          ? 'Saving…'
                          : (marketplaceListed[camp.id] ?? camp.marketplace_listed ?? false)
                            ? 'Listed ✓'
                            : 'Not listed'}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {widgetCampaign && (
        <WidgetBrowser
          campaign={widgetCampaign}
          onClose={() => setWidgetCampaign(null)}
        />
      )}

      {/* ── Cost-per-lead popover ── */}
      {costLeadCampaignId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setCostLeadCampaignId(null)}
        >
          <div
            style={{ background: 'var(--vs-bg)', borderRadius: 16, padding: 28, minWidth: 320, maxWidth: 400, width: '90vw', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Set your cost per lead</div>
              <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                Enter what you currently pay per lead through paid ads. ValueShare will calculate how much you&apos;re saving with organic referrals.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', marginBottom: 4 }}>Cost per lead</div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50"
                  value={costLeadAmount}
                  onChange={(e) => setCostLeadAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1.5px solid var(--border2)', background: 'var(--vs-bg)',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', marginBottom: 4 }}>Currency</div>
                <select
                  value={costLeadCurrency}
                  onChange={(e) => setCostLeadCurrency(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 9,
                    border: '1.5px solid var(--border2)', background: 'var(--vs-bg)',
                    fontSize: 13, outline: 'none', cursor: 'pointer',
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {costLeadAmount && parseFloat(costLeadAmount) > 0 && (
              <div style={{ background: 'rgba(5,150,105,.08)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>
                Estimated savings: {(() => {
                  const camp = campaigns.find((c) => c.id === costLeadCampaignId)
                  if (!camp) return '—'
                  const s = parseFloat(costLeadAmount) * camp.total_participants
                  try { return new Intl.NumberFormat('en', { style: 'currency', currency: costLeadCurrency, maximumFractionDigits: 0 }).format(s) } catch { return s.toLocaleString() }
                })()} saved so far
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="cfc-btn sec"
                onClick={() => setCostLeadCampaignId(null)}
                disabled={savingCostLead}
              >
                Cancel
              </button>
              <button
                className="cfc-btn primary"
                onClick={handleSaveCostLead}
                disabled={savingCostLead || !costLeadAmount}
              >
                {savingCostLead ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════
   ANALYTICS PAGE
   ═══════════════════════════════════════════ */
function AnalyticsPage({ data, campaigns }: { data: CreatorDashboardData | null; campaigns: CampaignWithTiers[] }) {
  const agg = data?.aggregate
  const bars30 = normalizeBarHeights(data?.clicks_per_day_30 ?? [])
  const dateLabels30 = (data?.clicks_per_day_30 ?? []).map((d) => formatDateLabel(d.date))

  const totalClicks = agg?.total_clicks ?? 0
  const totalParticipants = agg?.total_participants ?? 0
  const ctr = totalClicks > 0 ? ((totalParticipants / totalClicks) * 100).toFixed(1) : '0.0'
  const avgClicks = totalParticipants > 0 ? (totalClicks / totalParticipants).toFixed(1) : '0.0'
  const fraudBlocked = agg?.fraud_blocked ?? 0
  const rewardConv = totalParticipants > 0
    ? Math.round(((agg?.rewards_delivered ?? 0) / totalParticipants) * 100)
    : 0

  const sources = data?.click_sources ?? []
  const geo = data?.geo_distribution ?? []

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--ink)' }}>
          Analytics <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--coral)' }}>deep dive</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>Last 30 days · All campaigns combined</div>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-eyebrow">Click-through rate</div>
          <div className="kpi-value">{ctr}<span className="kpi-unit">%</span></div>
          <div className="kpi-change up">↑ Participants / clicks</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Avg clicks/participant</div>
          <div className="kpi-value">{avgClicks}</div>
          <div className="kpi-change up">↑ Engagement</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Fraud blocked</div>
          <div className="kpi-value">{formatNumber(fraudBlocked)}</div>
          <div className="kpi-change" style={{ background: 'rgba(217,119,6,.08)', color: '#d97706' }}>
            {totalClicks > 0 ? `⚠️ ${((fraudBlocked / (totalClicks + fraudBlocked)) * 100).toFixed(1)}%` : '⚠️ 0%'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Reward conversion</div>
          <div className="kpi-value">{rewardConv}<span className="kpi-unit">%</span></div>
          <div className="kpi-change up">↑ Auto-delivered</div>
        </div>
      </div>

      <div className="analytics-grid" style={{ marginBottom: 16 }}>
        <div className="d-card">
          <div className="d-card-hd">
            <div><div className="d-card-title">Clicks over 30 days</div></div>
            <div className="bc-tabs"><button className="bc-tab bc-active">Daily</button></div>
          </div>
          <div className="big-chart">
            <div className="big-bars">
              {bars30.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--ink3)', paddingTop: 40 }}>No data yet</div>
              ) : bars30.map((bar, i) => (
                <div key={i} className="bb" style={{ height: bar.h + '%', background: bar.peak ? 'var(--coral)' : i > bars30.length * 0.7 ? 'var(--coral-border)' : 'var(--slate3)' }}>
                  <div className="bbt">{bar.tip}</div>
                </div>
              ))}
            </div>
            <div className="big-labels">
              {dateLabels30.filter((_, i) => i % 3 === 0).map((l, i) => <div key={i} className="bl">{l}</div>)}
              <div className="bl" style={{ color: 'var(--coral)', fontWeight: 700 }}>Today</div>
            </div>
          </div>
        </div>

        <div className="d-card">
          <div className="d-card-hd"><div className="d-card-title">Traffic sources</div><div className="d-card-sub">Where clicks come from</div></div>
          {sources.length === 0 ? (
            <div style={{ padding: '24px 22px', fontSize: 13, color: 'var(--ink3)' }}>No click data yet.</div>
          ) : (
            <div className="sources">
              {sources.map((s) => (
                <div key={s.source} className="src-item">
                  <div className="src-ico" style={{ background: sourceBg(s.source) }}>{sourceIcon(s.source)}</div>
                  <div className="src-name" style={{ textTransform: 'capitalize' }}>{s.source}</div>
                  <div className="src-bar-wrap">
                    <div className="src-bar" style={{ width: s.pct + '%', background: sourceColor(s.source) }} />
                  </div>
                  <div className="src-pct">{s.pct}%</div>
                  <div className="src-count">{s.count} clicks</div>
                </div>
              ))}
            </div>
          )}
          {sources.length > 0 && (
            <div className="d-card-footer" style={{ fontSize: 12, color: 'var(--ink3)' }}>
              💡 {sources[0]?.source && `${sources[0].source.charAt(0).toUpperCase() + sources[0].source.slice(1)} dominates`} — optimize sharing captions for your top source to maximize growth.
            </div>
          )}
        </div>
      </div>

      {geo.length > 0 && (
        <div className="d-card">
          <div className="d-card-hd">
            <div className="d-card-title">Geographic distribution</div>
            <div className="d-card-sub">Top countries by verified clicks</div>
          </div>
          <div className="geo-list">
            {geo.map((g) => (
              <div key={g.country} className="geo-item">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="geo-country">{g.country}</div>
                </div>
                <div className="geo-bar-wrap"><div className="geo-bar" style={{ width: g.pct + '%' }} /></div>
                <div className="geo-clicks">{g.count}</div>
                <div className="geo-pct">{g.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="d-card">
        <div className="d-card-hd">
          <div>
            <div className="d-card-title">Campaign breakdown</div>
            <div className="d-card-sub">Individual performance for each campaign</div>
          </div>
        </div>
        {campaigns.length === 0 ? (
          <div style={{ padding: '24px 22px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
            No campaigns yet.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 70px', gap: '0 12px', padding: '0 22px 10px', fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              <div>Campaign</div><div>Status</div><div>Clicks</div><div>Joined</div><div>Viral</div>
            </div>
            {campaigns.map((c) => {
              const viral = c.total_participants > 0
                ? (c.total_clicks / c.total_participants).toFixed(1)
                : '—'
              return (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 70px', gap: '0 12px', padding: '12px 22px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div><span className={`chip ${c.status === 'active' ? 'chip-green' : 'chip-amber'}`}>● {c.status}</span></div>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{formatNumber(c.total_clicks)}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{formatNumber(c.total_participants)}</div>
                  <div style={{ fontSize: 13, color: viral !== '—' ? 'var(--emerald)' : 'var(--ink3)' }}>{viral !== '—' ? `${viral}×` : '—'}</div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   PARTICIPANTS PAGE
   ═══════════════════════════════════════════ */
function ParticipantsPage({ data }: { data: CreatorDashboardData | null }) {
  const participants = data?.participants ?? []
  const total = data?.aggregate?.total_participants ?? 0
  const withReward = participants.filter((p) => p.has_reward).length
  const withoutReward = participants.length - withReward

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--ink)', marginBottom: 20 }}>
        All <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--coral)' }}>Participants</span>
      </div>
      <div className="d-card">
        <div className="d-card-hd">
          <div>
            <div className="d-card-title">{formatNumber(total)} participant{total !== 1 ? 's' : ''} across all campaigns</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="chip chip-green">● {withReward} with reward</div>
            <div className="chip chip-amber">{withoutReward} in progress</div>
          </div>
        </div>
        {participants.length === 0 ? (
          <div style={{ padding: '32px 22px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
            No participants yet. Share your campaign to get started.
          </div>
        ) : (
          <>
            <div className="plist-hd" style={{ gridTemplateColumns: '32px 1fr 120px 80px 80px 90px' }}>
              <div className="ph">#</div>
              <div className="ph">Participant</div>
              <div className="ph">Campaign</div>
              <div className="ph">Clicks</div>
              <div className="ph">Joined</div>
              <div className="ph">Status</div>
            </div>
            <div className="plist">
              {participants.map((p: CreatorParticipant, i: number) => (
                <div key={p.id} className="prow" style={{ gridTemplateColumns: '32px 1fr 120px 80px 80px 90px' }}>
                  <div className="pr-rank">{RANK_ICONS[i] ?? String(i + 1)}</div>
                  <div className="pr-info">
                    <div className="pr-av" style={{ background: avatarColor(i) }}>
                      {p.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="pr-name">{p.email.split('@')[0]}</div>
                      <div className="pr-sub">{anonymizeEmail(p.email)}</div>
                    </div>
                  </div>
                  <div className="pr-reward" style={{ fontSize: 12 }}>{p.campaign_name}</div>
                  <div className="pr-clicks">{p.click_count}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                    {new Date(p.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={`pr-status ${p.has_reward ? 'earned' : 'progress'}`}>
                    <div className="sd" />{p.has_reward ? 'Earned' : 'In progress'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   REWARDS PAGE
   ═══════════════════════════════════════════ */
function RewardsPage({ data }: { data: CreatorDashboardData | null }) {
  const unlocks = data?.reward_unlocks ?? []
  const rewardsDelivered = data?.aggregate?.rewards_delivered ?? 0
  const totalParticipants = data?.aggregate?.total_participants ?? 0
  const pending = Math.max(0, totalParticipants - rewardsDelivered)

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--ink)', marginBottom: 20 }}>
        Rewards <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--coral)' }}>delivered</span>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-eyebrow">Total delivered</div>
          <div className="kpi-value">{formatNumber(rewardsDelivered)}</div>
          <div className="kpi-change up">↑ Auto-delivered</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Pending</div>
          <div className="kpi-value">{formatNumber(pending)}</div>
          <div className="kpi-sub">Still working</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Failed delivery</div>
          <div className="kpi-value">0</div>
          <div className="kpi-change up">↑ 100% success</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Conversion</div>
          <div className="kpi-value">
            {totalParticipants > 0 ? Math.round((rewardsDelivered / totalParticipants) * 100) : 0}
            <span className="kpi-unit">%</span>
          </div>
          <div className="kpi-change up">↑ Participants → reward</div>
        </div>
      </div>

      <div className="two-col">
        <div className="d-card">
          <div className="d-card-hd">
            <div className="d-card-title">Recent reward deliveries</div>
            <div className="d-card-sub">All automatic · No manual work</div>
          </div>
          {unlocks.length === 0 ? (
            <div style={{ padding: '32px 22px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
              No rewards delivered yet. Participants are working towards their goals.
            </div>
          ) : (
            <div>
              {unlocks.map((u: CreatorRewardUnlock, i: number) => (
                <div key={i} className="rd-row">
                  <div className="rd-info">
                    <div className="rd-av" style={{ background: avatarColor(i) }}>{u.initial}</div>
                    <div>
                      <div className="rd-name">{u.display_name}</div>
                      <div className="rd-camp">{u.campaign_name}</div>
                    </div>
                  </div>
                  <div className="rd-reward">{rewardTypeIcon(undefined)} {u.reward_label}</div>
                  <div className="rd-time">{timeAgo(u.unlocked_at)}</div>
                  <div className="chip chip-green">Delivered</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="d-card">
          <div className="d-card-hd"><div className="d-card-title">Delivery method</div></div>
          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                <span style={{ fontSize: 18 }}>📧</span> Email auto-delivery
              </div>
              <div className="chip chip-green">Active</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                <span style={{ fontSize: 18 }}>🔗</span> Direct link delivery
              </div>
              <div className="chip chip-green">Active</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', background: 'var(--slate)', borderRadius: 8, padding: '10px 12px' }}>
              💡 Rewards are delivered automatically the moment a participant hits their click milestone. Zero manual work required.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   FRAUD PAGE
   ═══════════════════════════════════════════ */
function FraudPage({ data }: { data: CreatorDashboardData | null }) {
  const summary = data?.fraud_summary ?? { total: 0, duplicate_ip: 0, vpn_proxy: 0, velocity: 0 }
  const flags = data?.fraud_flags ?? []
  const totalClicks = data?.aggregate?.total_clicks ?? 0
  const fraudPct = totalClicks + summary.total > 0
    ? ((summary.total / (totalClicks + summary.total)) * 100).toFixed(1)
    : '0.0'

  function primaryReason(reasons: string[]): string {
    if (!reasons || reasons.length === 0) return 'Unknown'
    const r = reasons[0]
    if (r.includes('dup') || r.includes('ip')) return 'Dup. IP'
    if (r.includes('vpn') || r.includes('proxy')) return 'VPN/Proxy'
    if (r.includes('velocity') || r.includes('fast')) return 'Velocity'
    return r
  }

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--ink)', marginBottom: 20 }}>
        Fraud <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--coral)' }}>Shield</span>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-eyebrow">Total blocked</div>
          <div className="kpi-value">{formatNumber(summary.total)}</div>
          <div className="kpi-change" style={{ background: 'rgba(217,119,6,.08)', color: '#d97706' }}>
            ⚠️ {fraudPct}%
          </div>
          <div className="kpi-sub">Of total clicks</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Duplicate IPs</div>
          <div className="kpi-value">{formatNumber(summary.duplicate_ip)}</div>
          <div className="kpi-sub">Same source, blocked</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">VPN/Proxy</div>
          <div className="kpi-value">{formatNumber(summary.vpn_proxy)}</div>
          <div className="kpi-sub">Masked origin, blocked</div>
        </div>
        <div className="kpi">
          <div className="kpi-eyebrow">Velocity flagged</div>
          <div className="kpi-value">{formatNumber(summary.velocity)}</div>
          <div className="kpi-sub">Too fast, blocked</div>
        </div>
      </div>

      <div className="d-card">
        <div className="d-card-hd">
          <div>
            <div className="d-card-title">Flagged activity log</div>
            <div className="d-card-sub">Most recent invalid clicks</div>
          </div>
          {flags.length > 0 && (
            <div className="chip chip-amber">⚠️ {flags.length} flagged</div>
          )}
        </div>
        {flags.length === 0 ? (
          <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--ink3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>All clear</div>
            <div style={{ fontSize: 13 }}>No fraud detected across your campaigns.</div>
          </div>
        ) : (
          <>
            <div className="plist-hd" style={{ gridTemplateColumns: '1fr 120px 140px 120px' }}>
              <div className="ph">Details</div>
              <div className="ph">Campaign</div>
              <div className="ph">IP Address</div>
              <div className="ph">Reason</div>
            </div>
            <div className="plist">
              {flags.map((f: FraudFlag, i: number) => (
                <div key={i} className="prow" style={{ gridTemplateColumns: '1fr 120px 140px 120px' }}>
                  <div className="pr-info">
                    <div className="pr-av" style={{ background: '#d97706' }}>?</div>
                    <div>
                      <div className="pr-name">Unknown participant</div>
                      <div className="pr-sub">
                        {f.country ? `${f.country} · ` : ''}{timeAgo(f.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="pr-reward" style={{ fontSize: 12 }}>{f.campaign_name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ink3)' }}>
                    {f.ip_address ? f.ip_address.replace(/\d+$/, 'x') : '—'}
                  </div>
                  <div className="chip chip-amber">{primaryReason(f.fraud_reasons)}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="d-card-footer" style={{ fontSize: 12, color: 'var(--ink3)' }}>
          🛡️ Fraud Shield uses IP tracking, device fingerprinting, and velocity checks. All blocked clicks are excluded from participant counts and reward calculations.
        </div>
      </div>
    </>
  )
}
