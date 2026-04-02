'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import Toast from '@/components/Toast'
import NotificationPanel from './NotificationPanel'
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Users,
  Trophy,
  ShieldCheck,
  Store,
  Settings,
  LogOut,
  Rocket,
  ChevronDown,
  User,
  ArrowLeftRight,
} from 'lucide-react'

type NavPage = 'overview' | 'campaigns' | 'analytics' | 'participants' | 'rewards' | 'fraud' | 'settings'

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

export default function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const activeTab: NavPage = pathname.startsWith('/dashboard/creator/campaigns')
    ? 'campaigns'
    : (searchParams.get('tab') ?? 'overview') as NavPage
  const [user, setUser] = useState<{ id: string; name: string; email: string; initial: string } | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [activeCampaignCount, setActiveCampaignCount] = useState<number>(0)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [hasParticipantAccount, setHasParticipantAccount] = useState(false)
  const [notifToast, setNotifToast] = useState<{ message: string; type: 'info' | 'success' | 'celebration' | 'warning'; icon: string } | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return

      const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Creator'
      setUser({
        id: u.id,
        name,
        email: u.email || '',
        initial: name.charAt(0).toUpperCase(),
      })

      // Fetch active campaign count + unread count + notifications list + profile photo in parallel
      const [campsResult, notifCountResult, notifListResult, profileResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', u.id)
          .eq('status', 'active'),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('creator_profiles')
          .select('photo_url')
          .eq('user_id', u.id)
          .single(),
      ])

      setActiveCampaignCount(campsResult.count ?? 0)
      setUnreadCount(notifCountResult.count ?? 0)
      setNotifications((notifListResult.data ?? []) as Notification[])
      if (profileResult.data?.photo_url) {
        setProfilePhotoUrl(profileResult.data.photo_url)
      }

      // Check if this creator also has participant records (for role switcher)
      const { count: participantCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
      setHasParticipantAccount((participantCount ?? 0) > 0)
    }

    init()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  async function handleMarkAllRead() {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', u.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function handleMarkRead(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  // Real-time notifications
  const handleCreatorNotification = useCallback((n: Notification) => {
    setUnreadCount((c) => c + 1)
    setNotifications((prev) => [n, ...prev].slice(0, 20))
    const icon = n.type === 'new_participant' ? '👤' : n.type === 'progress_milestone' ? '🏆' : '🔔'
    const type: 'info' | 'success' = n.type === 'progress_milestone' ? 'success' : 'info'
    setNotifToast({ message: n.message || 'New notification', type, icon })
  }, [])

  useRealtimeNotifications(user?.id ?? null, handleCreatorNotification)

  // Outside-click for notification panel
  useEffect(() => {
    if (!showPanel) return
    function handleOutsideClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showPanel])

  // Outside-click for profile dropdown
  useEffect(() => {
    if (!showProfileDropdown) return
    function handleOutsideClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showProfileDropdown])

  const displayName = user?.name?.split(' ')[0] || 'Creator'

  const navItems: { page: NavPage; icon: React.ComponentType<{ size?: number }>; label: string; badge?: string; badgeColor?: string }[] = [
    { page: 'overview', icon: LayoutDashboard, label: 'Overview' },
    {
      page: 'campaigns', icon: Megaphone, label: 'Campaigns',
      badge: activeCampaignCount > 0 ? String(activeCampaignCount) : undefined,
    },
    { page: 'analytics', icon: BarChart3, label: 'Analytics' },
    { page: 'participants', icon: Users, label: 'Participants' },
    {
      page: 'rewards', icon: Trophy, label: 'Rewards',
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeColor: 'var(--emerald)',
    },
  ]

  const toolItems: { page?: NavPage; href?: string; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { page: 'fraud', icon: ShieldCheck, label: 'Fraud Shield' },
    { href: 'https://valueshare.co/marketplace', icon: Store, label: 'Marketplace' },
    { page: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div className={`sb-backdrop${sidebarOpen ? ' active' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen ? ' sb-open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-logo-ic">◆</div>
          <div className="sb-logo-name">Value<span>Share</span></div>
        </div>

        <div className="sb-creator">
          <div className="sb-av">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user?.initial || 'C'
            )}
          </div>
          <div>
            <div className="sb-cname">{user?.name || 'Loading...'}</div>
            <div className="sb-crole">Creator</div>
          </div>
          <div className="sb-plan">Pro</div>
        </div>

        <div className="sb-section">Main</div>
        <nav className="sb-nav">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`sb-item${activeTab === item.page ? ' active' : ''}`}
              data-page={item.page}
              onClick={() => { router.push(`/dashboard/creator?tab=${item.page}`); setSidebarOpen(false) }}
            >
              <span className="si-ico"><item.icon size={18} /></span>
              <span className="si-lbl">{item.label}</span>
              {item.badge && (
                <span className="sb-badge" style={item.badgeColor ? { background: item.badgeColor } : undefined}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sb-divider" />
        <div className="sb-section">Tools</div>
        <nav className="sb-nav">
          {toolItems.map((item) => (
            <button
              key={item.label}
              className={`sb-item${activeTab === item.page ? ' active' : ''}`}
              data-page={item.page || ''}
              onClick={() => {
                if (item.href) { window.open(item.href, '_blank'); setSidebarOpen(false) }
                else if (item.page) { router.push(`/dashboard/creator?tab=${item.page}`); setSidebarOpen(false) }
              }}
            >
              <span className="si-ico"><item.icon size={18} /></span>
              <span className="si-lbl">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sb-bottom">
          <div className="sb-upgrade">
            <div className="sb-up-t"><Rocket size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Scale faster</div>
            <div className="sb-up-s">Unlock unlimited campaigns and advanced fraud detection.</div>
            <button className="sb-up-btn" onClick={() => router.push('/dashboard/creator?tab=settings')}>Upgrade to Scale →</button>
          </div>
          {hasParticipantAccount && (
            <a
              href="/dashboard/participant"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.22)', borderRadius: 9, padding: '9px 12px', textDecoration: 'none', color: 'var(--emerald)', fontSize: 13, fontWeight: 700, marginBottom: 8, transition: 'all .2s' }}
            >
              <ArrowLeftRight size={15} />
              Switch to Participant View
            </a>
          )}
          <button className="sb-signout" onClick={handleSignOut} disabled={signingOut}>
            <span className="si-ico"><LogOut size={18} /></span>
            <span className="si-lbl">{signingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="dash-main">
        <header className="dash-header">
          <div className="dh-left">
            <button className="dh-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span /><span /><span />
            </button>
            <div className="dh-head-info">
              <div className="dh-greeting">{getGreeting()}, <span>{displayName}</span></div>
              <div className="dh-date">{formatDate()}</div>
            </div>
          </div>
          <div className="dh-right">
            <div className="dh-search">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4" stroke="#a8a29e" strokeWidth="1.4" />
                <path d="M11 11l2.5 2.5" stroke="#a8a29e" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Search campaigns…
            </div>
            <div
              className="dh-notif"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => setShowPanel((v) => !v)}
              ref={bellRef}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a4.5 4.5 0 014.5 4.5c0 2.5.7 3.5 1.2 4H2.3c.5-.5 1.2-1.5 1.2-4A4.5 4.5 0 018 1.5zM6.5 13.5a1.5 1.5 0 003 0" stroke="#57534e" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {unreadCount > 0 && <div className="dh-notif-dot" />}
              {showPanel && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowPanel(false)}
                  onMarkAllRead={handleMarkAllRead}
                  onMarkRead={handleMarkRead}
                />
              )}
            </div>
            <div className="dh-profile" ref={profileRef}>
              <button
                className="dh-avatar-btn"
                onClick={() => setShowProfileDropdown((v) => !v)}
              >
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="" className="dh-avatar-img" />
                ) : (
                  <div className="dh-avatar-initial">{user?.initial || 'C'}</div>
                )}
                <ChevronDown size={14} style={{ color: 'var(--ink3)' }} />
              </button>
              {showProfileDropdown && (
                <div className="dh-dropdown">
                  <button className="dh-dd-item" onClick={() => {
                    router.push('/dashboard/creator?tab=settings')
                    setShowProfileDropdown(false)
                  }}>
                    <User size={14} /> Profile
                  </button>
                  <button className="dh-dd-item" onClick={() => {
                    router.push('/dashboard/creator?tab=settings')
                    setShowProfileDropdown(false)
                  }}>
                    <Settings size={14} /> Settings
                  </button>
                  <div className="dh-dd-divider" />
                  <button className="dh-dd-item dh-dd-danger" onClick={handleSignOut}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile-only greeting shown below header, above hero card */}
        <div className="dh-mob-greeting">
          {getGreeting()}, <span>{displayName}</span>
        </div>

        <div className="dash-content">
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
  )
}
