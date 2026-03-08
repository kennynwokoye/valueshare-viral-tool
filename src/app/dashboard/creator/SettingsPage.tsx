'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Lock,
  Bell,
  CreditCard,
  AlertTriangle,
  Camera,
  Check,
  CircleAlert,
} from 'lucide-react'

type Section = 'profile' | 'account' | 'notifications' | 'billing' | 'danger'

const NAV: { id: Section; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'account', icon: Lock, label: 'Account' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'danger', icon: AlertTriangle, label: 'Danger Zone' },
]

interface NotifPrefs {
  new_participant: boolean
  reward_unlocked: boolean
  campaign_milestone: boolean
  weekly_digest: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  new_participant: true,
  reward_unlocked: true,
  campaign_milestone: true,
  weekly_digest: true,
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('profile')
  const [loading, setLoading] = useState(true)

  // Profile state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Account state
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

  // Danger zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Feedback
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load profile on mount
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setName(data.name || '')
        setBio(data.bio || '')
        setWebsite(data.website || '')
        setPhotoUrl(data.photo_url || null)
        setPhotoPreview(data.photo_url || null)
        setEmail(data.email || '')
        if (data.notification_preferences) {
          setNotifPrefs({ ...DEFAULT_PREFS, ...data.notification_preferences })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ── Profile save ──
  async function handleSaveProfile() {
    setSaving(true)
    setMessage(null)

    let uploadedUrl = photoUrl

    // Upload photo if new file selected
    if (photoFile) {
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); showMsg('error', 'Not authenticated'); return }

      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, photoFile, { upsert: true })

      if (uploadError) {
        setSaving(false)
        showMsg('error', `Upload failed: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      uploadedUrl = urlData.publicUrl
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio, website, photo_url: uploadedUrl }),
    })

    setSaving(false)
    if (res.ok) {
      setPhotoUrl(uploadedUrl)
      setPhotoFile(null)
      showMsg('success', 'Profile saved successfully')
    } else {
      const data = await res.json()
      showMsg('error', data.error || 'Failed to save profile')
    }
  }

  // ── Password change ──
  async function handleChangePassword() {
    if (newPassword.length < 6) {
      showMsg('error', 'Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (error) {
      showMsg('error', error.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      showMsg('success', 'Password updated successfully')
    }
  }

  // ── Notification prefs save ──
  async function handleSaveNotifications() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_preferences: notifPrefs }),
    })
    setSaving(false)
    if (res.ok) {
      showMsg('success', 'Notification preferences saved')
    } else {
      showMsg('error', 'Failed to save preferences')
    }
  }

  // ── Delete account ──
  async function handleDeleteAccount() {
    if (deleteEmail !== email) {
      showMsg('error', 'Email does not match')
      return
    }

    setDeleting(true)
    const res = await fetch('/api/profile', { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/auth/login'
    } else {
      setDeleting(false)
      showMsg('error', 'Failed to delete account')
    }
  }

  // ── Photo selection ──
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase() || 'C'

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
        Loading settings...
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.03em', marginBottom: 24 }}>
        Settings
      </h2>

      {message && (
        <div className={`settings-msg ${message.type}`}>
          {message.type === 'success' ? <Check size={14} /> : <CircleAlert size={14} />}
          {message.text}
        </div>
      )}

      <div className="settings-layout">
        {/* Nav */}
        <nav className="settings-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`settings-nav-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-section">

          {/* ═══ PROFILE ═══ */}
          {section === 'profile' && (
            <div className="settings-card">
              <div className="settings-card-title">Profile</div>
              <div className="settings-card-sub">
                This information appears on your campaign pages and emails to participants.
              </div>

              <div className="settings-avatar-wrap">
                <div className="settings-avatar" onClick={() => fileRef.current?.click()}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="" />
                  ) : (
                    initial
                  )}
                  <div className="settings-avatar-overlay">
                    <Camera size={20} color="#fff" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                    Profile photo
                  </div>
                  <div className="settings-avatar-hint">
                    Click to upload. JPG or PNG, max 2MB.
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </div>

              <div className="settings-form-row">
                <label>Display Name</label>
                <input
                  className="vs-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="settings-form-row">
                <label>Bio</label>
                <textarea
                  className="vs-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell participants about yourself..."
                />
              </div>

              <div className="settings-form-row">
                <label>Website</label>
                <input
                  className="vs-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                />
              </div>

              <button className="settings-save" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* ═══ ACCOUNT ═══ */}
          {section === 'account' && (
            <div className="settings-card">
              <div className="settings-card-title">Account</div>
              <div className="settings-card-sub">
                Manage your email and password.
              </div>

              <div className="settings-form-row">
                <label>Email</label>
                <input
                  className="vs-input"
                  value={email}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
                Change Password
              </div>

              <div className="settings-form-row">
                <label>New Password</label>
                <input
                  className="vs-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="settings-form-row">
                <label>Confirm New Password</label>
                <input
                  className="vs-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>

              <button className="settings-save" onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {section === 'notifications' && (
            <div className="settings-card">
              <div className="settings-card-title">Email Notifications</div>
              <div className="settings-card-sub">
                Choose which emails you want to receive.
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="settings-toggle-label">New participant joined</div>
                  <div className="settings-toggle-sub">Get notified when someone joins your campaign</div>
                </div>
                <button
                  className={`st-toggle${notifPrefs.new_participant ? ' on' : ''}`}
                  onClick={() => setNotifPrefs((p) => ({ ...p, new_participant: !p.new_participant }))}
                />
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="settings-toggle-label">Reward unlocked</div>
                  <div className="settings-toggle-sub">Get notified when a participant unlocks a reward</div>
                </div>
                <button
                  className={`st-toggle${notifPrefs.reward_unlocked ? ' on' : ''}`}
                  onClick={() => setNotifPrefs((p) => ({ ...p, reward_unlocked: !p.reward_unlocked }))}
                />
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="settings-toggle-label">Campaign milestone reached</div>
                  <div className="settings-toggle-sub">Alerts at 50, 100, 500, and 1000 participants</div>
                </div>
                <button
                  className={`st-toggle${notifPrefs.campaign_milestone ? ' on' : ''}`}
                  onClick={() => setNotifPrefs((p) => ({ ...p, campaign_milestone: !p.campaign_milestone }))}
                />
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="settings-toggle-label">Weekly performance digest</div>
                  <div className="settings-toggle-sub">Summary of clicks, new participants, and rewards every Monday</div>
                </div>
                <button
                  className={`st-toggle${notifPrefs.weekly_digest ? ' on' : ''}`}
                  onClick={() => setNotifPrefs((p) => ({ ...p, weekly_digest: !p.weekly_digest }))}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="settings-save" onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ BILLING ═══ */}
          {section === 'billing' && (
            <div className="settings-card">
              <div className="settings-card-title">Billing & Plan</div>
              <div className="settings-card-sub">
                Manage your subscription and billing details.
              </div>

              <div className="billing-plan">
                <div>
                  <div className="billing-plan-name">Free Plan</div>
                </div>
                <div className="billing-plan-badge">Current</div>
              </div>

              <ul className="billing-features">
                <li><Check size={14} /> Up to 3 active campaigns</li>
                <li><Check size={14} /> Basic fraud detection</li>
                <li><Check size={14} /> Email notifications</li>
                <li><Check size={14} /> Embed widget</li>
              </ul>

              <div style={{
                padding: 16, background: 'var(--slate)', borderRadius: 10,
                border: '1px solid var(--border2)', marginBottom: 20,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Scale Plan
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12, lineHeight: 1.5 }}>
                  Unlimited campaigns, advanced fraud detection, priority support, and custom branding.
                </div>
                <button
                  className="settings-save"
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  Coming Soon
                </button>
              </div>
            </div>
          )}

          {/* ═══ DANGER ZONE ═══ */}
          {section === 'danger' && (
            <div className="dz-card">
              <div className="dz-title">Danger Zone</div>
              <div className="dz-sub">
                Permanently delete your account and all associated data including campaigns,
                participants, and reward records. This action cannot be undone.
              </div>

              {!showDeleteConfirm ? (
                <button className="dz-btn" onClick={() => setShowDeleteConfirm(true)}>
                  Delete my account
                </button>
              ) : (
                <div className="dz-confirm">
                  <div className="dz-confirm-text">
                    To confirm, type your email address: <strong>{email}</strong>
                  </div>
                  <input
                    className="dz-confirm-input"
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    placeholder={email}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="dz-btn"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteEmail !== email}
                      style={deleteEmail !== email ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                    >
                      {deleting ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                    <button
                      className="settings-save"
                      style={{ background: 'var(--slate3)', color: 'var(--ink2)' }}
                      onClick={() => { setShowDeleteConfirm(false); setDeleteEmail('') }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
