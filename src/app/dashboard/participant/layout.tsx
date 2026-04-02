'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Participant, Campaign, CampaignSwitcherItem, RewardTier, UserRole, Notification } from '@/types'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import Toast from '@/components/Toast'
import {
  LayoutDashboard,
  Target,
  Share2,
  Trophy,
  Gift,
  Download,
  LogOut,
  Rocket,
  ArrowLeftRight,
} from 'lucide-react'
import BecomeCreatorModal from './BecomeCreatorModal'

// ── Context ──────────────────────────────────────────────

interface ParticipantContextValue {
  userId: string | null
  activeCampaignId: string | null
  setActiveCampaignId: (id: string) => void
  participant: Participant | null
  campaign: Campaign | null
  campaigns: CampaignSwitcherItem[]
  unreadCount: number
  loading: boolean
}

const ParticipantContext = createContext<ParticipantContextValue>({
  userId: null,
  activeCampaignId: null,
  setActiveCampaignId: () => { },
  participant: null,
  campaign: null,
  campaigns: [],
  unreadCount: 0,
  loading: true,
})

export function useParticipantContext() {
  return useContext(ParticipantContext)
}

// ── Helpers ──────────────────────────────────────────────

type NavPage = 'overview' | 'progress' | 'share' | 'leaderboard' | 'reward'

const NAV_ITEMS: { page: NavPage; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { page: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { page: 'progress', icon: Target, label: 'My Progress' },
  { page: 'share', icon: Share2, label: 'Share & Earn' },
  { page: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  { page: 'reward', icon: Gift, label: 'My Reward' },
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatJoinedDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STORAGE_KEY = 'vs_active_campaign'

// ── Layout Component ─────────────────────────────────────

export default function ParticipantDashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ id: string; name: string; email: string; initial: string } | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignSwitcherItem[]>([])
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('participant')
  const [showCreatorModal, setShowCreatorModal] = useState(false)
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [showAllSidebarCampaigns, setShowAllSidebarCampaigns] = useState(false)
  const [notifToast, setNotifToast] = useState<{ message: string; type: 'info' | 'success' | 'celebration' | 'warning'; icon: string } | null>(null)

  const setActiveCampaignId = useCallback((id: string) => {
    setActiveCampaignIdState(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch { }
  }, [])

  // Fetch user + all participant records on mount
  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return

      const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Participant'
      setUser({
        id: u.id,
        name,
        email: u.email || '',
        initial: name.charAt(0).toUpperCase(),
      })

      // Fetch role for role-switcher UI
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', u.id)
        .single()
      if (userRow?.role) setUserRole(userRow.role as UserRole)

      // Fetch all participant records with campaign data
      const { data: participantRows } = await supabase
        .from('participants')
        .select('*, campaigns(*)')
        .eq('user_id', u.id)
        .order('joined_at', { ascending: false })

      if (!participantRows || participantRows.length === 0) {
        setLoading(false)
        return
      }

      // Fetch first reward tier for each campaign (for progress in sidebar)
      const campaignIds = participantRows.map((p: Participant & { campaigns: Campaign }) => p.campaign_id)
      const { data: tiers } = await supabase
        .from('reward_tiers')
        .select('campaign_id, threshold')
        .in('campaign_id', campaignIds)
        .order('tier_order', { ascending: true })

      // Build first-threshold lookup
      const firstThreshold: Record<string, number> = {}
      for (const t of (tiers ?? []) as RewardTier[]) {
        if (!(t.campaign_id in firstThreshold)) {
          firstThreshold[t.campaign_id] = t.threshold
        }
      }

      // Build campaign switcher items
      const items: CampaignSwitcherItem[] = participantRows.map((p: Participant & { campaigns: Campaign }) => {
        const nextT = firstThreshold[p.campaign_id] ?? null
        return {
          participantId: p.id,
          campaignId: p.campaign_id,
          campaignName: p.campaigns.name,
          campaignStatus: p.campaigns.status,
          clickCount: p.click_count,
          nextThreshold: nextT,
          isGoalReached: nextT !== null ? p.click_count >= nextT : false,
          referralCode: p.referral_code ?? '',
        }
      })
      setCampaigns(items)

      // Determine initial active campaign
      const urlCampaign = searchParams.get('campaign')
      let stored: string | null = null
      try { stored = localStorage.getItem(STORAGE_KEY) } catch { }

      const initialId = urlCampaign && items.some((c) => c.campaignId === urlCampaign)
        ? urlCampaign
        : stored && items.some((c) => c.campaignId === stored)
          ? stored
          : items[0]?.campaignId ?? null

      if (initialId) {
        setActiveCampaignIdState(initialId)
        try { localStorage.setItem(STORAGE_KEY, initialId) } catch { }
      }

      // Fetch unread notification count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('is_read', false)

      setUnreadCount(count ?? 0)
      setLoading(false)
    }

    init()
  }, [searchParams])

  // Real-time notifications
  const handleNotification = useCallback((n: Notification) => {
    setUnreadCount((c) => c + 1)
    const icon = n.type === 'reward_unlocked' ? '🎁' : n.type === 'fraud_spike' ? '🛡️' : '🔔'
    const type: 'info' | 'celebration' = n.type === 'reward_unlocked' ? 'celebration' : 'info'
    setNotifToast({ message: n.message || 'New notification', type, icon })
  }, [])

  useRealtimeNotifications(user?.id ?? null, handleNotification)

  // Campaign switcher live counts
  useEffect(() => {
    if (!user?.id || campaigns.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel(`switcher-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; click_count: number }
          setCampaigns((prev) =>
            prev.map((c) =>
              c.participantId === updated.id
                ? {
                    ...c,
                    clickCount: updated.click_count,
                    isGoalReached: c.nextThreshold !== null ? updated.click_count >= c.nextThreshold : false,
                  }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, campaigns.length])

  // When activeCampaignId changes, update participant + campaign from the campaigns list
  useEffect(() => {
    if (!activeCampaignId || campaigns.length === 0) return

    const supabase = createClient()
    const item = campaigns.find((c) => c.campaignId === activeCampaignId)
    if (!item) return

    supabase
      .from('participants')
      .select('*, campaigns(*)')
      .eq('id', item.participantId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const row = data as Participant & { campaigns: Campaign }
        setParticipant({
          id: row.id,
          user_id: row.user_id,
          campaign_id: row.campaign_id,
          referral_code: row.referral_code,
          email: row.email,
          otp_code: row.otp_code,
          otp_expires_at: row.otp_expires_at,
          click_count: row.click_count,
          conversion_count: row.conversion_count,
          joined_at: row.joined_at,
          last_active_at: row.last_active_at,
        })
        setCampaign(row.campaigns)
      })
  }, [activeCampaignId, campaigns])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/join'
  }

  const displayName = user?.name?.split(' ')[0] || 'Participant'
  const activeItem = campaigns.find((c) => c.campaignId === activeCampaignId)

  return (
    <ParticipantContext.Provider value={{
      userId: user?.id ?? null,
      activeCampaignId,
      setActiveCampaignId,
      participant,
      campaign,
      campaigns,
      unreadCount,
      loading,
    }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div className={`sb-backdrop${sidebarOpen ? ' active' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* SIDEBAR */}
        <aside className={`sidebar sidebar-participant${sidebarOpen ? ' sb-open' : ''}`}>
          <div className="sb-logo">
            <div className="sb-logo-ic">◆</div>
            <div className="sb-logo-name">Value<span>Share</span></div>
          </div>

          <div className="sb-participant">
            <div className="sb-av-row">
              <div className="sb-av">{user?.initial || 'P'}</div>
              <div>
                <div className="sb-pname">{user?.name || 'Loading...'}</div>
                <div className="sb-prole">
                  Participant{participant ? ` · Since ${formatJoinedDate(participant.joined_at)}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="sb-section">My Dashboard</div>
          <nav className="sb-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.page}
                className="sb-item"
                data-page={item.page}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="si-ico"><item.icon size={18} /></span>
                <span className="si-lbl">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sb-divider" />
          <div className="sb-section">Campaigns</div>
          <div className="sb-camp-switch">
            {loading ? (
              <div style={{ padding: '12px', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Loading...</div>
            ) : campaigns.length === 0 ? (
              <div style={{ padding: '12px', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>No campaigns yet</div>
            ) : (
              <>
                {(showAllSidebarCampaigns ? campaigns : campaigns.slice(0, 3)).map((c) => (
                  <div
                    key={c.campaignId}
                    className={`scs-item${c.campaignId === activeCampaignId ? ' active-c' : ''}`}
                    onClick={() => { setActiveCampaignId(c.campaignId); setSidebarOpen(false) }}
                  >
                    <div
                      className="scs-dot"
                      style={{
                        background: c.isGoalReached
                          ? 'var(--emerald)'
                          : c.campaignStatus === 'active'
                            ? 'var(--amber, #d97706)'
                            : 'rgba(255,255,255,.2)',
                      }}
                    />
                    <div className="scs-name">{c.campaignName}</div>
                    <div className="scs-prog">
                      {c.nextThreshold !== null
                        ? c.isGoalReached
                          ? `${c.clickCount}/${c.nextThreshold} ✓`
                          : `${c.clickCount}/${c.nextThreshold}`
                        : `${c.clickCount} clicks`}
                    </div>
                  </div>
                ))}
                {!showAllSidebarCampaigns && campaigns.length > 3 && (
                  <button className="scs-view-all" onClick={() => setShowAllSidebarCampaigns(true)}>
                    View all {campaigns.length} campaigns →
                  </button>
                )}
              </>
            )}
          </div>

          <div className="sb-bottom">
            <div className="sb-help">
              <div className="sh-t">Need help sharing?</div>
              <div className="sh-s">Download your promo flyer and captions to maximise reach.</div>
              <button className="sh-btn" onClick={() => {
                const shareBtn = document.querySelector('[data-page="share"]') as HTMLElement | null
                shareBtn?.click()
              }}><Download size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Get materials</button>
            </div>

            {/* Role switcher */}
            <div style={{ marginTop: 10 }}>
              {(userRole === 'creator' || userRole === 'both') ? (
                <a
                  href="/dashboard/creator"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,58,.12)', border: '1px solid rgba(232,93,58,.25)', borderRadius: 9, padding: '9px 12px', textDecoration: 'none', color: 'var(--coral, #e85d3a)', fontSize: 13, fontWeight: 700, transition: 'all .2s' }}
                >
                  <ArrowLeftRight size={15} />
                  Switch to Creator Dashboard
                </a>
              ) : (
                <button
                  onClick={() => setShowCreatorModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'rgba(232,93,58,.08)', border: '1px solid rgba(232,93,58,.2)', borderRadius: 9, padding: '9px 12px', color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cabinet Grotesk',sans-serif", transition: 'all .2s', textAlign: 'left' }}
                >
                  <Rocket size={15} />
                  Become a Creator →
                </button>
              )}
            </div>

            <button className="sb-signout" onClick={handleSignOut} disabled={signingOut} style={{ marginTop: 8 }}>
              <span className="si-ico"><LogOut size={18} /></span>
              <span className="si-lbl">{signingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>

          {/* Become Creator Modal */}
          {showCreatorModal && (
            <BecomeCreatorModal
              userName={user?.name || ''}
              onClose={() => setShowCreatorModal(false)}
            />
          )}
        </aside>

        {/* MAIN */}
        <div className="dash-main">
          <header className="dash-header">
            <div className="dh-left">
              <button className="dh-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <span /><span /><span />
              </button>
              <div className="dh-head-info">
                <div className="h-greeting">{getGreeting()}, <span>{displayName}</span></div>
                <div className="h-date">
                  {formatDate()}
                  {activeItem ? ` · ${activeItem.campaignName} Campaign` : ''}
                </div>
              </div>
            </div>
            <div className="dh-right">
              <div className="dh-notif">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5a4.5 4.5 0 014.5 4.5c0 2.5.7 3.5 1.2 4H2.3c.5-.5 1.2-1.5 1.2-4A4.5 4.5 0 018 1.5zM6.5 13.5a1.5 1.5 0 003 0" stroke="#57534e" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {unreadCount > 0 && <div className="dh-notif-dot" />}
              </div>
              <button className="btn-share" onClick={() => {
                const shareBtn = document.querySelector('[data-page="share"]') as HTMLElement | null
                shareBtn?.click()
              }}><Share2 size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Share now</button>
            </div>
          </header>

          {/* Mobile-only greeting — shown below header, above content */}
          <div className="dh-mob-greeting">
            {getGreeting()}, <span>{displayName}</span>
          </div>

          <div className="dash-content">
            {/* Campaign context bar — shown when participant is in multiple campaigns */}
            {!loading && campaign && campaigns.length > 1 && (
              <div className="campaign-context-bar" style={{ position: 'relative' }}>
                <div className="ccb-left">
                  <div
                    className="ccb-dot"
                    style={{ background: campaign.status === 'active' ? 'var(--emerald)' : 'var(--ink3)' }}
                  />
                  <span className="ccb-label">Viewing:</span>
                  <span className="ccb-name">{campaign.name}</span>
                  <span className={`ccb-badge ${campaign.status === 'active' ? 'ccb-active' : 'ccb-other'}`}>
                    {campaign.status}
                  </span>
                </div>
                <button
                  className="ccb-switch"
                  onClick={() => { setShowCampaignPicker(true); setPickerSearch('') }}
                >
                  Switch campaign ↕
                </button>

                {/* Campaign picker dropdown */}
                {showCampaignPicker && (
                  <div className="ccb-picker-backdrop" onClick={() => setShowCampaignPicker(false)} />
                )}
                {showCampaignPicker && (
                  <div className="ccb-picker">
                    <div className="ccb-picker-header">
                      <span>Switch campaign</span>
                      <button onClick={() => setShowCampaignPicker(false)}>×</button>
                    </div>
                    {campaigns.length > 4 && (
                      <input
                        className="ccb-picker-search"
                        type="text"
                        placeholder="Search campaigns…"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        autoFocus
                      />
                    )}
                    <div className="ccb-picker-list">
                      {campaigns
                        .filter((c) => c.campaignName.toLowerCase().includes(pickerSearch.toLowerCase()))
                        .map((c) => (
                          <div
                            key={c.campaignId}
                            className={`ccb-picker-item${c.campaignId === activeCampaignId ? ' active' : ''}`}
                            onClick={() => { setActiveCampaignId(c.campaignId); setShowCampaignPicker(false) }}
                          >
                            <div className="ccb-picker-dot" style={{
                              background: c.isGoalReached ? 'var(--emerald)'
                                : c.campaignStatus === 'active' ? 'var(--amber,#d97706)'
                                : 'var(--ink3)'
                            }} />
                            <div className="ccb-picker-info">
                              <div className="ccb-picker-name">{c.campaignName}</div>
                              <div className="ccb-picker-prog">
                                {c.nextThreshold !== null
                                  ? `${c.clickCount}/${c.nextThreshold} clicks`
                                  : `${c.clickCount} clicks`}
                              </div>
                            </div>
                            {c.campaignId === activeCampaignId && <span className="ccb-picker-check">✓</span>}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {children}
          </div>

          {/* Real-time notification toast */}
          {notifToast && (
            <Toast
              message={notifToast.message}
              type={notifToast.type}
              icon={notifToast.icon}
              onDismiss={() => setNotifToast(null)}
            />
          )}
        </div>
      </div>
    </ParticipantContext.Provider>
  )
}
