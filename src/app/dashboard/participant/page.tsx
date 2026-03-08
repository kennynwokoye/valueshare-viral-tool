'use client'

import { useState, useEffect } from 'react'
import { useParticipantContext } from './layout'
import { useParticipantDashboard } from '@/hooks/useParticipantDashboard'
import { useRealtimeClicks } from '@/hooks/useRealtimeClicks'
import { formatReferralUrl, getProgressPercentage, generateShareCaptions, formatTimeRemaining } from '@/lib/utils'
import { buildShareUrl } from '@/lib/share'
import { createClient } from '@/lib/supabase/client'
import type { ReferralClick, RewardTier, RewardUnlock, LeaderboardEntry, CampaignSwitcherItem } from '@/types'

type Page = 'overview' | 'progress' | 'share' | 'leaderboard' | 'reward'

// ── Helpers ──────────────────────────────────────────────

function calcStreak(clicks: ReferralClick[]): number {
  if (clicks.length === 0) return 0
  const days = new Set(clicks.map((c) => c.created_at.slice(0, 10)))
  const sorted = Array.from(days).sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    if (sorted[i] === expected || (i === 0 && sorted[i] === today)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function clickSourceIcon(source: string | null): string {
  switch (source) {
    case 'whatsapp': return '💬'
    case 'facebook': return '📘'
    case 'twitter': return '🐦'
    case 'linkedin': return '🔗'
    case 'instagram': return '📸'
    case 'email': return '✉️'
    case 'direct': return '🔗'
    default: return '🌐'
  }
}

function clickSourceLabel(source: string | null): string {
  switch (source) {
    case 'whatsapp': return 'WhatsApp'
    case 'facebook': return 'Facebook'
    case 'twitter': return 'Twitter/X'
    case 'linkedin': return 'LinkedIn'
    case 'instagram': return 'Instagram'
    case 'email': return 'Email'
    case 'direct': return 'Direct link'
    default: return 'Other source'
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Main Page ────────────────────────────────────────────

export default function ParticipantDashboardPage() {
  const ctx = useParticipantContext()
  const { data, loading, error, refresh } = useParticipantDashboard(
    ctx.participant?.id ?? null,
    ctx.activeCampaignId
  )
  const { realtimeClicks, realtimeClickCount } = useRealtimeClicks(
    ctx.participant?.id ?? null,
    ctx.activeCampaignId,
    data?.participant.click_count ?? 0
  )

  const [activePage, setActivePage] = useState<Page>('overview')
  const [copied, setCopied] = useState(false)

  // Wire sidebar nav from layout
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
      if (htmlEl.dataset.page === activePage) {
        htmlEl.classList.add('active')
      } else {
        htmlEl.classList.remove('active')
      }
    })
  }, [activePage])

  // Merge realtime clicks with initial data
  const allClicks = [...realtimeClicks, ...(data?.recentClicks ?? [])]
  const clickCount = realtimeClickCount ?? data?.participant.click_count ?? 0

  function handleCopy() {
    if (!data?.participant.referral_code) return
    navigator.clipboard.writeText(formatReferralUrl(data.participant.referral_code))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading / error / empty states
  if (ctx.loading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', fontWeight: 600 }}>Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (ctx.campaigns.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>No campaigns yet</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.5 }}>
            You haven&apos;t joined any campaigns yet. Browse the ValueShare marketplace or join through a campaign link to get started.
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', fontWeight: 600 }}>{error || 'Failed to load data'}</div>
          <button onClick={refresh} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--vs-surface)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Cabinet Grotesk',sans-serif" }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const referralLink = formatReferralUrl(data.participant.referral_code)
  const nextTier = data.rewardTiers.find((t) => t.threshold > clickCount) ?? data.rewardTiers[data.rewardTiers.length - 1]
  const progress = nextTier ? getProgressPercentage(clickCount, nextTier.threshold) : 100
  const goalReached = nextTier ? clickCount >= nextTier.threshold : true
  const streak = calcStreak(allClicks)

  const captions = nextTier
    ? generateShareCaptions({
      referralLink,
      campaignHeadline: data.campaign.headline,
      rewardLabel: nextTier.reward_label,
      threshold: nextTier.threshold,
      kpiType: data.campaign.kpi_type,
    })
    : null

  return (
    <>
      {activePage === 'overview' && (
        <OverviewPage
          data={data}
          clickCount={clickCount}
          allClicks={allClicks}
          referralLink={referralLink}
          nextTier={nextTier ?? null}
          progress={progress}
          goalReached={goalReached}
          streak={streak}
          captions={captions}
          onCopy={handleCopy}
          copied={copied}
          onNavigate={setActivePage}
        />
      )}
      {activePage === 'progress' && (
        <ProgressPage data={data} clickCount={clickCount} campaigns={ctx.campaigns} />
      )}
      {activePage === 'share' && (
        <SharePage data={data} referralLink={referralLink} captions={captions} onCopy={handleCopy} copied={copied} />
      )}
      {activePage === 'leaderboard' && (
        <LeaderboardPage data={data} />
      )}
      {activePage === 'reward' && (
        <RewardPage data={data} clickCount={clickCount} />
      )}
    </>
  )
}

/* ══════════════════════════════════════════
   LEADERBOARD ROW (shared component)
   ══════════════════════════════════════════ */

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankDisplay = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : String(entry.rank)
  const rankClass = entry.rank === 1 ? ' g' : entry.rank === 2 ? ' s' : entry.rank === 3 ? ' b' : ''
  const colors = ['#059669', '#0284c7', '#db2777', '#7c3aed', '#be185d', '#d97706']
  const color = colors[(entry.display_name.charCodeAt(0) || 0) % colors.length]

  return (
    <div className={`lb-item${entry.is_me ? ' me' : ''}`}>
      <div className={`lb-rank${rankClass}`}>{rankDisplay}</div>
      <div className="lb-info">
        <div className="lb-av" style={{ background: color }}>{entry.initial}</div>
        <div>
          <div className="lb-name">{entry.is_me ? `You — ${entry.display_name} 🎉` : entry.display_name}</div>
          <div className="lb-sub">{timeAgo(entry.joined_at)}</div>
        </div>
      </div>
      <div className="lb-clicks">{entry.click_count}</div>
      <div className={`lb-status progress`}>{entry.click_count}</div>
    </div>
  )
}

/* ══════════════════════════════════════════
   OVERVIEW PAGE
   ══════════════════════════════════════════ */

interface OverviewProps {
  data: NonNullable<ReturnType<typeof useParticipantDashboard>['data']>
  clickCount: number
  allClicks: ReferralClick[]
  referralLink: string
  nextTier: RewardTier | null
  progress: number
  goalReached: boolean
  streak: number
  captions: Record<string, string> | null
  onCopy: () => void
  copied: boolean
  onNavigate: (p: Page) => void
}

function OverviewPage({ data, clickCount, allClicks, referralLink, nextTier, progress, goalReached, streak, captions, onCopy, copied, onNavigate }: OverviewProps) {
  const threshold = nextTier?.threshold ?? 0
  const gaugeCircumference = 2 * Math.PI * 56
  const gaugeOffset = gaugeCircumference - (Math.min(progress, 100) / 100) * gaugeCircumference

  function handleShare(platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin') {
    if (!captions) return
    window.open(buildShareUrl(platform, { url: referralLink, text: captions[platform] }), '_blank')
  }

  return (
    <>
      {/* Mission Hero */}
      <div className="mission-hero">
        <div className="mh-glow" /><div className="mh-glow2" />
        <div className="mh-left">
          <div className="mh-eyebrow">Active Campaign</div>
          <div className="mh-campaign">{data.campaign.name.split(' ').map((w, i) => i === 0 ? w + ' ' : <span key={i}>{w} </span>)}</div>
          <div className="mh-goal">
            {goalReached
              ? <>Drive {threshold} verified clicks to unlock your reward. You&apos;ve already <strong style={{ color: 'rgba(255,255,255,.9)' }}>exceeded the goal!</strong></>
              : <>Drive {threshold} verified clicks to unlock {nextTier?.reward_label}. You need <strong style={{ color: 'rgba(255,255,255,.9)' }}>{threshold - clickCount} more</strong>.</>}
          </div>
          <div className="mh-prog-label">
            <div className="mh-prog-left">{clickCount} clicks earned</div>
            <div className="mh-prog-right">{goalReached ? `${progress}% ✓` : `${progress}%`}</div>
          </div>
          <div className="mh-prog-track"><div className="mh-prog-fill" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
          <div className="mh-prog-sub">Goal: {threshold} clicks · Reward: {nextTier?.reward_label ?? 'N/A'}</div>
        </div>
        <div className="mh-right">
          <div className="big-gauge">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
              <circle cx="70" cy="70" r="56" fill="none" stroke="var(--emerald)" strokeWidth="10" strokeDasharray={gaugeCircumference} strokeDashoffset={gaugeOffset} strokeLinecap="round" />
            </svg>
            <div className="gauge-center">
              <div className="gc-val">{clickCount}</div>
              <div className="gc-sub">clicks</div>
              <div className="gc-goal">{goalReached ? `goal: ${threshold} ✓` : `goal: ${threshold}`}</div>
            </div>
          </div>
          {data.myRank && <div className="chip chip-green">🏆 #{data.myRank} on leaderboard</div>}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-glow" style={{ background: 'var(--emerald)' }} />
          <div className="kpi-eyebrow">My clicks</div>
          <div className="kpi-value">{clickCount}</div>
          <div className={`kpi-change ${goalReached ? 'up' : ''}`}>{goalReached ? '🔥 Goal exceeded!' : `${threshold - clickCount} to go`}</div>
          <div className="kpi-sub">Needed {threshold} to unlock</div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: 'var(--emerald)' }} />
          <div className="kpi-eyebrow">Rank</div>
          <div className="kpi-value">{data.myRank ? `#${data.myRank}` : '—'}</div>
          <div className="kpi-change up">{data.myRank === 1 ? '⭐ Top performer' : data.myRank ? `Top ${data.totalParticipants > 0 ? Math.round((data.myRank / data.totalParticipants) * 100) : 0}%` : 'No rank yet'}</div>
          <div className="kpi-sub">Out of {data.totalParticipants} participants</div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: '#f59e0b' }} />
          <div className="kpi-eyebrow">Streak</div>
          <div className="kpi-value">{streak}<span style={{ fontSize: 18, fontWeight: 700 }}>🔥</span></div>
          <div className="kpi-change up">{streak > 0 ? 'Active daily' : 'Start sharing!'}</div>
          <div className="kpi-sub">{streak > 0 ? 'Shared every day' : 'Share to start a streak'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-glow" style={{ background: '#7c3aed' }} />
          <div className="kpi-eyebrow">Reward</div>
          <div className="kpi-value">{data.unlockedRewards.length > 0 ? '🎁' : '🔒'}</div>
          <div className="kpi-change up">{data.unlockedRewards.length > 0 ? 'Unlocked!' : 'Locked'}</div>
          <div className="kpi-sub">{nextTier?.reward_label ?? 'N/A'}</div>
        </div>
      </div>

      {/* Two columns */}
      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Referral Link Card */}
          <div className="p-card">
            <div className="p-card-hd">
              <div><div className="p-card-title">Your referral link</div><div className="p-card-sub">Share this to earn clicks</div></div>
              <div className="chip chip-green">Active</div>
            </div>
            <div className="ref-box">
              <div className="ref-label">Your unique link</div>
              <div className="ref-link-row">
                <div className="ref-link">{referralLink}</div>
                <button className="ref-copy-btn" onClick={onCopy}>{copied ? '✓ Copied!' : '📋 Copy link'}</button>
              </div>
              <div className="ref-note">Every click through your link is tracked and verified. Share widely!</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div className="share-grid">
                <button className="share-btn sb-wa" onClick={() => handleShare('whatsapp')}><span className="sb-ico">💬</span>WhatsApp</button>
                <button className="share-btn sb-fb" onClick={() => handleShare('facebook')}><span className="sb-ico">📘</span>Facebook</button>
                <button className="share-btn sb-tw" onClick={() => handleShare('twitter')}><span className="sb-ico">🐦</span>Twitter/X</button>
                <button className="share-btn sb-ig" onClick={() => window.open(referralLink, '_blank')}><span className="sb-ico">📸</span>Instagram</button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="p-card">
            <div className="p-card-hd"><div className="p-card-title">Boost your clicks 🚀</div></div>
            <div className="tips-grid">
              <div className="tip-card"><div className="tip-ico">💬</div><div className="tip-t">WhatsApp Status</div><div className="tip-s">Post your flyer as a status — it reaches all your contacts automatically.</div></div>
              <div className="tip-card"><div className="tip-ico">👥</div><div className="tip-t">Group Chats</div><div className="tip-s">Share in WhatsApp and Telegram groups for 10× the reach.</div></div>
              <div className="tip-card"><div className="tip-ico">📲</div><div className="tip-t">Stories</div><div className="tip-s">Facebook and Instagram Stories with your referral link in bio.</div></div>
              <div className="tip-card"><div className="tip-ico">✍️</div><div className="tip-t">Use the Caption</div><div className="tip-s">Our pre-written caption is optimised for engagement. Copy it!</div></div>
            </div>
          </div>
        </div>

        <div className="col-stack">
          {/* Reward status */}
          <div className="p-card">
            <div className="p-card-hd">
              <div><div className="p-card-title">My reward</div></div>
              <div className={`chip ${goalReached ? 'chip-green' : 'chip-grey'}`}>{goalReached ? '🎁 Unlocked!' : '🔒 Locked'}</div>
            </div>
            {nextTier && (
              <div className="reward-hero">
                <div className="rh-icon">{goalReached ? '🎓' : '🔒'}</div>
                <div className="rh-info">
                  <div className="rh-name">{nextTier.reward_label}</div>
                  <div className="rh-desc">{nextTier.preview_teaser ?? `Unlock by reaching ${nextTier.threshold} clicks`}</div>
                  <div className="rh-prog-row">
                    <div className="rh-prog-l">{clickCount} / {nextTier.threshold} clicks</div>
                    <div className="rh-prog-r">{goalReached ? '✓ Complete' : `${progress}%`}</div>
                  </div>
                  <div className="rh-bar"><div className="rh-fill" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
                </div>
              </div>
            )}
          </div>

          {/* Mini Leaderboard */}
          <div className="p-card">
            <div className="p-card-hd">
              <div><div className="p-card-title">Leaderboard</div><div className="p-card-sub">{data.campaign.name}</div></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald)', cursor: 'pointer' }} onClick={() => onNavigate('leaderboard')}>Full →</span>
            </div>
            <div className="lb-list">
              {data.leaderboard.slice(0, 4).map((p) => (
                <LeaderboardRow key={`${p.rank}-${p.display_name}`} entry={p} />
              ))}
              {data.leaderboard.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink3)' }}>No participants yet</div>
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="p-card">
            <div className="p-card-hd">
              <div><div className="p-card-title">My activity</div></div>
              <div className="chip chip-green"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} /> Live</div>
            </div>
            <div className="feed-list">
              {allClicks.slice(0, 5).map((c) => (
                <div key={c.id} className="feed-item">
                  <div className="fi-av" style={{ background: c.is_valid ? 'var(--emerald)' : 'var(--vs-error)' }}>{clickSourceIcon(c.click_source)}</div>
                  <div className="fi-body">
                    <div className="fi-text"><strong>Click</strong> from {clickSourceLabel(c.click_source)}</div>
                    <div className="fi-time">{timeAgo(c.created_at)}</div>
                  </div>
                  <div className={`fi-badge chip ${c.is_valid ? 'chip-green' : 'chip-grey'}`}>{c.is_valid ? '+1' : 'Blocked'}</div>
                </div>
              ))}
              {allClicks.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink3)' }}>No clicks yet — start sharing!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MY PROGRESS PAGE
   ══════════════════════════════════════════ */

function ProgressPage({ data, clickCount, campaigns }: {
  data: NonNullable<ReturnType<typeof useParticipantDashboard>['data']>
  clickCount: number
  campaigns: CampaignSwitcherItem[]
}) {
  const milestones = [
    {
      status: 'done' as const,
      icon: '✓',
      label: 'Joined the campaign ✓',
      sub: new Date(data.participant.joined_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    },
    ...data.rewardTiers.map((tier) => {
      const done = clickCount >= tier.threshold
      const isCurrent = !done && (data.rewardTiers.find((t) => t.threshold > clickCount)?.id === tier.id)
      return {
        status: done ? 'done' as const : isCurrent ? 'current' as const : 'next' as const,
        icon: done ? '✓' : isCurrent ? '🔥' : '🔒',
        label: done
          ? `${tier.label} — ${tier.threshold} clicks ✓`
          : isCurrent
            ? `${tier.label} — ${clickCount}/${tier.threshold} clicks`
            : `${tier.label} — ${tier.threshold} clicks`,
        sub: done
          ? `Reward: ${tier.reward_label} · Unlocked`
          : isCurrent
            ? `${tier.threshold - clickCount} more clicks needed`
            : `Reward: ${tier.reward_label}`,
      }
    }),
  ]

  return (
    <>
      <div className="page-hd">
        <div className="page-title">My <span>Progress</span></div>
        <div className="page-sub">Track your journey across all active campaigns</div>
      </div>
      <div className="two-col">
        <div className="p-card">
          <div className="p-card-hd"><div><div className="p-card-title">Milestone journey</div><div className="p-card-sub">{data.campaign.name}</div></div></div>
          <div className="milestone-track">
            {milestones.map((m, i) => (
              <div key={i} className="ms-item">
                <div className={`ms-dot ${m.status}`}>{m.icon}</div>
                <div className="ms-info">
                  <div className={`ms-label ${m.status}-t`}>{m.label}</div>
                  <div className="ms-sub">{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="p-card">
            <div className="p-card-hd"><div className="p-card-title">Campaign progress</div></div>
            {campaigns.map((c, idx) => {
              const prog = c.nextThreshold ? getProgressPercentage(c.clickCount, c.nextThreshold) : 100
              return (
                <div key={c.campaignId} className="reward-hero" style={idx > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
                  <div className="rh-icon" style={{ width: 44, height: 44, fontSize: 22, borderRadius: 10 }}>
                    {c.isGoalReached ? '✅' : '📊'}
                  </div>
                  <div className="rh-info">
                    <div className="rh-name" style={{ fontSize: 14 }}>{c.campaignName}</div>
                    <div className="rh-prog-row">
                      <div className="rh-prog-l">{c.clickCount} / {c.nextThreshold ?? '?'} clicks</div>
                      <div className="rh-prog-r">{c.isGoalReached ? `${prog}% ✓` : `${prog}%`}</div>
                    </div>
                    <div className="rh-bar">
                      <div className="rh-fill" style={{ width: `${Math.min(prog, 100)}%`, background: c.isGoalReached ? undefined : 'var(--amber, #d97706)' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   SHARE & EARN PAGE
   ══════════════════════════════════════════ */

function SharePage({ data, referralLink, captions, onCopy, copied }: {
  data: NonNullable<ReturnType<typeof useParticipantDashboard>['data']>
  referralLink: string
  captions: Record<string, string> | null
  onCopy: () => void
  copied: boolean
}) {
  const [captionCopied, setCaptionCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(referralLink, { width: 200, margin: 2 }).then(setQrDataUrl)
    }).catch(() => { })
  }, [referralLink])

  function handleCaptionCopy() {
    if (!captions) return
    navigator.clipboard.writeText(captions.whatsapp)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  function handleShare(platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'email') {
    if (!captions) return
    const text = captions[platform] ?? captions.whatsapp
    window.open(buildShareUrl(platform, { url: referralLink, text, subject: data.campaign.headline }), '_blank')
  }

  function handleDownload(filePath: string, fileName: string) {
    const supabase = createClient()
    const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(filePath)
    const a = document.createElement('a')
    a.href = urlData.publicUrl
    a.download = fileName
    a.target = '_blank'
    a.click()
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-title">Share <span>& Earn</span></div>
        <div className="page-sub">Use these tools to drive clicks and climb the leaderboard</div>
      </div>
      <div className="two-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="p-card">
            <div className="p-card-hd"><div><div className="p-card-title">Your unique referral link</div><div className="p-card-sub">Every click is tracked and verified automatically</div></div></div>
            <div className="ref-box">
              <div className="ref-label">{data.campaign.name}</div>
              <div className="ref-link-row">
                <div className="ref-link">{referralLink}</div>
                <button className="ref-copy-btn" onClick={onCopy}>{copied ? '✓ Copied!' : '📋 Copy link'}</button>
              </div>
              <div className="ref-note">💡 Pro tip: Add your link to your bio, stories, and WhatsApp status for maximum reach.</div>
            </div>
          </div>
          <div className="p-card">
            <div className="p-card-hd"><div className="p-card-title">Share on social media</div></div>
            <div className="share-grid">
              <button className="share-btn sb-wa" onClick={() => handleShare('whatsapp')}><span className="sb-ico">💬</span>WhatsApp Status</button>
              <button className="share-btn sb-wa" onClick={() => handleShare('whatsapp')}><span className="sb-ico">💬</span>WhatsApp Groups</button>
              <button className="share-btn sb-fb" onClick={() => handleShare('facebook')}><span className="sb-ico">📘</span>Facebook</button>
              <button className="share-btn sb-tw" onClick={() => handleShare('twitter')}><span className="sb-ico">🐦</span>Twitter/X</button>
              <button className="share-btn sb-ig" onClick={() => window.open(referralLink, '_blank')}><span className="sb-ico">📸</span>Instagram</button>
              <button className="share-btn sb-em" onClick={() => handleShare('email')}><span className="sb-ico">✉️</span>Email</button>
            </div>
          </div>
          {qrDataUrl && (
            <div className="p-card">
              <div className="p-card-hd"><div className="p-card-title">QR Code</div></div>
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Referral QR Code" width={160} height={160} />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="p-card">
            <div className="p-card-hd"><div className="p-card-title">Promo materials</div></div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.promoAssets.length > 0 ? (
                data.promoAssets.map((asset) => (
                  <div key={asset.id} style={{ background: 'var(--slate)', border: '1px solid var(--border2)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => handleDownload(asset.file_path, asset.file_name)}>
                    <div style={{ fontSize: 28 }}>🖼️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{asset.file_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{asset.file_type} · Ready to share</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--emerald)' }}>⬇ Download</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink3)', padding: 8 }}>No promo materials available yet.</div>
              )}
            </div>
          </div>
          <div className="p-card">
            <div className="p-card-hd"><div className="p-card-title">Suggested caption</div></div>
            <div style={{ padding: '14px 22px' }}>
              <div style={{ background: 'var(--slate)', border: '1.5px solid var(--border2)', borderRadius: 9, padding: 14, fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>
                {captions?.whatsapp ?? 'No caption available'}
              </div>
              <button className="ref-copy-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={handleCaptionCopy}>
                {captionCopied ? '✓ Caption copied!' : '📋 Copy caption'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   LEADERBOARD PAGE
   ══════════════════════════════════════════ */

function LeaderboardPage({ data }: { data: NonNullable<ReturnType<typeof useParticipantDashboard>['data']> }) {
  return (
    <>
      <div className="page-hd">
        <div className="page-title">🏆 <span>Leaderboard</span></div>
        <div className="page-sub">{data.campaign.name} · {data.totalParticipants} participants</div>
      </div>
      <div className="p-card">
        <div className="p-card-hd">
          <div><div className="p-card-title">Top participants</div><div className="p-card-sub">Ranked by verified clicks · Updated live</div></div>
          <div className="chip chip-green">Live</div>
        </div>
        <div className="lb-list">
          {data.leaderboard.map((entry) => (
            <LeaderboardRow key={entry.participant_id ?? entry.rank} entry={entry} />
          ))}
          {data.leaderboard.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink3)' }}>No participants yet. Be the first to share!</div>
          )}
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MY REWARD PAGE
   ══════════════════════════════════════════ */

function RewardPage({ data, clickCount }: {
  data: NonNullable<ReturnType<typeof useParticipantDashboard>['data']>
  clickCount: number
}) {
  function handleAccess(unlock: RewardUnlock & { tier: RewardTier }) {
    if (unlock.tier.reward_type === 'file' && unlock.tier.reward_file_path) {
      const supabase = createClient()
      const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(unlock.tier.reward_file_path)
      window.open(urlData.publicUrl, '_blank')
    } else if (unlock.tier.reward_url) {
      window.open(unlock.tier.reward_url, '_blank')
    }
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-title">My <span>Reward</span></div>
        <div className="page-sub">Your earned rewards across all campaigns</div>
      </div>
      <div className="two-col">
        {/* Unlocked rewards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.rewardTiers.map((tier) => {
            const unlock = data.unlockedRewards.find((u) => u.tier_id === tier.id)
            if (!unlock) return null

            return (
              <div key={tier.id} className="p-card">
                <div className="p-card-hd">
                  <div><div className="p-card-title">{tier.reward_label}</div><div className="p-card-sub">{data.campaign.name}</div></div>
                  <div className="chip chip-green">🎁 Unlocked</div>
                </div>
                <div className="reward-hero">
                  <div className="rh-icon" style={{ width: 80, height: 80, fontSize: 40, borderRadius: 16 }}>🎓</div>
                  <div className="rh-info">
                    <div className="rh-name">{tier.reward_label}</div>
                    <div className="rh-desc">{tier.preview_teaser ?? 'Access your unlocked reward below.'}</div>
                    {unlock.token_expires_at && (
                      <div className="rh-sub" style={{ marginBottom: 8 }}>
                        Expires: {formatTimeRemaining(unlock.token_expires_at)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => handleAccess(unlock)}
                        style={{ background: 'var(--emerald)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cabinet Grotesk',sans-serif" }}
                      >
                        Access Reward →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {data.unlockedRewards.length === 0 && (
            <div className="p-card">
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>No rewards unlocked yet</div>
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>Keep sharing to reach your goal and unlock rewards!</div>
              </div>
            </div>
          )}
        </div>

        {/* Locked rewards */}
        <div className="col-stack">
          {data.rewardTiers.map((tier) => {
            const unlock = data.unlockedRewards.find((u) => u.tier_id === tier.id)
            if (unlock) return null

            const prog = getProgressPercentage(clickCount, tier.threshold)
            const remaining = Math.max(0, tier.threshold - clickCount)

            return (
              <div key={tier.id} className="p-card">
                <div className="p-card-hd"><div className="p-card-title">{tier.label}</div></div>
                <div className="rh-locked">
                  <div className="rh-l-ico">🔒</div>
                  <div className="rh-l-text">You need <strong>{remaining} more click{remaining !== 1 ? 's' : ''}</strong> to unlock {tier.reward_label}. You&apos;re at {clickCount}/{tier.threshold}.</div>
                </div>
                <div className="reward-hero" style={{ padding: '12px 22px 16px' }}>
                  <div className="rh-icon" style={{ width: 44, height: 44, fontSize: 22 }}>🔒</div>
                  <div className="rh-info">
                    <div className="rh-name" style={{ fontSize: 14 }}>{tier.reward_label}</div>
                    <div className="rh-prog-row">
                      <div className="rh-prog-l">{clickCount} / {tier.threshold} clicks</div>
                      <div className="rh-prog-r">{prog}%</div>
                    </div>
                    <div className="rh-bar"><div className="rh-fill" style={{ width: `${prog}%`, background: 'var(--amber, #d97706)' }} /></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
