'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userName: string
  onClose: () => void
}

function getPasswordScore(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

function getStrengthLabel(s: number) {
  if (s <= 1) return 'Weak'
  if (s === 2) return 'Fair'
  if (s === 3) return 'Good'
  if (s === 4) return 'Strong'
  return 'Very strong'
}

function getStrengthColor(s: number) {
  if (s <= 2) return 'var(--vs-error,#dc2626)'
  if (s === 3) return 'var(--vs-warning,#d97706)'
  return 'var(--vs-success,#059669)'
}

export default function BecomeCreatorModal({ userName, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(userName)
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pwScore = getPasswordScore(password)
  const pwStrengthColor = getStrengthColor(pwScore)

  function handleStep1Continue() {
    if (!name.trim()) { setError('Creator name is required'); return }
    setError('')
    setStep(2)
  }

  function handleStep2Continue() {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setStep(3)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    // Set password on the existing auth account
    const supabase = createClient()
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError('Failed to set password: ' + pwError.message)
      setLoading(false)
      return
    }

    // Upgrade role to creator
    const res = await fetch('/api/auth/add-creator-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), bio: bio.trim() || undefined }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/dashboard/creator')
  }

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,.18)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                {step === 1 ? 'Set up your creator profile' : step === 2 ? 'Set a password' : 'Review your profile'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 3 }}>Step {step} of 3</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink3)', padding: 4, lineHeight: 1 }}>×</button>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 16, height: 4, background: 'var(--slate2)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--coral)', borderRadius: 100, transition: 'width .3s' }} />
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* ── Step 1: Profile ── */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>
                  Creator name <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or brand name"
                  className="auth-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 6 }}>This is what participants will see when they join your campaigns.</div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>
                  Short bio <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 500 }}>(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell participants a bit about yourself or your brand…"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 9, border: '1.5px solid var(--border2)', background: 'var(--vs-bg)', fontSize: 13, fontFamily: "'Cabinet Grotesk',sans-serif", color: 'var(--ink)', resize: 'vertical', outline: 'none' }}
                />
              </div>
              {error && <div style={{ fontSize: 13, color: 'var(--vs-error,#dc2626)', marginBottom: 16 }}>⚠ {error}</div>}
              <button onClick={handleStep1Continue} className="auth-btn" style={{ width: '100%' }}>
                Continue →
              </button>
            </>
          )}

          {/* ── Step 2: Password ── */}
          {step === 2 && (
            <>
              <div style={{ background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: 'var(--ink2)' }}>
                Set a password so you can log in to your creator account at any time from the login page.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>
                  Password <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="auth-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{ flex: 1, height: 4, borderRadius: 100, background: i <= pwScore ? pwStrengthColor : 'var(--slate2)', transition: 'background .2s' }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: pwStrengthColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {getStrengthLabel(pwScore)}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink2)', marginBottom: 6 }}>
                  Confirm password <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="auth-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoComplete="new-password"
                />
              </div>
              {error && <div style={{ fontSize: 13, color: 'var(--vs-error,#dc2626)', marginBottom: 16 }}>⚠ {error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setError(''); setStep(1) }}
                  style={{ flex: 1, padding: '12px', borderRadius: 9, border: '1.5px solid var(--border2)', background: 'var(--white)', color: 'var(--ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cabinet Grotesk',sans-serif" }}
                >
                  ← Back
                </button>
                <button onClick={handleStep2Continue} className="auth-btn" style={{ flex: 2 }}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <>
              <div style={{ background: 'var(--slate)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Creator profile preview</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{name}</div>
                {bio && <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.5 }}>{bio}</div>}
              </div>
              <div style={{ background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 700, marginBottom: 4 }}>What happens next</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7 }}>
                  <li>Your creator dashboard will be activated</li>
                  <li>You can switch between your creator and participant views at any time</li>
                  <li>Your participant campaigns and progress are unchanged</li>
                </ul>
              </div>
              {error && <div style={{ fontSize: 13, color: 'var(--vs-error,#dc2626)', marginBottom: 16 }}>⚠ {error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setError(''); setStep(2) }}
                  style={{ flex: 1, padding: '12px', borderRadius: 9, border: '1.5px solid var(--border2)', background: 'var(--white)', color: 'var(--ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cabinet Grotesk',sans-serif" }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="auth-btn"
                  style={{ flex: 2 }}
                >
                  {loading ? <><span className="auth-spinner" /> Creating account…</> : 'Create Creator Account →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
