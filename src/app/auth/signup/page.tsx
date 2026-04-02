'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  if (s <= 2) return 'var(--vs-error)'
  if (s === 3) return 'var(--vs-warning)'
  return 'var(--vs-success)'
}

const GOOGLE_SVG = (
  <svg width="15" height="15" viewBox="0 0 16 16">
    <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="#4285F4" />
    <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.72.48-1.63.76-2.71.76-2.08 0-3.85-1.41-4.48-3.3H.86v2.07A8 8 0 008 16z" fill="#34A853" />
    <path d="M3.52 9.51A4.8 4.8 0 013.27 8c0-.52.09-1.03.25-1.51V4.42H.86A8 8 0 000 8c0 1.29.31 2.51.86 3.58l2.66-2.07z" fill="#FBBC05" />
    <path d="M8 3.18c1.17 0 2.22.4 3.05 1.2l2.28-2.28A8 8 0 00.86 4.42L3.52 6.49C4.15 4.6 5.92 3.18 8 3.18z" fill="#EA4335" />
  </svg>
)

export default function SignupPage() {

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [emailOk, setEmailOk] = useState(true)
  const [resendError, setResendError] = useState('')

  const score = getPasswordScore(password)
  const strengthColor = getStrengthColor(score)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) { setError('First name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)

    let country = 'US'
    try {
      const geo = await fetch('https://ipapi.co/json/')
      const data = await geo.json()
      if (data.country_code) country = data.country_code
    } catch { /* default US */ }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          role: 'creator',
          country,
        },
        emailRedirectTo: window.location.origin + '/auth/callback?next=/dashboard/creator',
      },
    })

    if (authError) {
      setError(
        authError.message.toLowerCase().includes('already registered')
          ? 'An account with this email already exists.'
          : authError.message
      )
      setLoading(false)
      return
    }

    // Send confirmation email via our own Zeptomail SMTP instead of relying on Supabase's built-in email
    try {
      const emailRes = await fetch('/api/auth/send-creator-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!emailRes.ok) setEmailOk(false)
    } catch { setEmailOk(false) }

    setSuccess(true)
    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    setResent(false)
    setResendError('')
    try {
      const res = await fetch('/api/auth/send-creator-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResent(true)
        setEmailOk(true)
      } else {
        setResendError('Failed to send — please try again or contact support.')
      }
    } catch {
      setResendError('Failed to send — please try again or contact support.')
    } finally {
      setResending(false)
    }
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback?next=/dashboard/creator',
      },
    })
  }

  if (success) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">✉</div>
        <div className="auth-title" style={{ textAlign: 'center' }}>Check your inbox</div>
        <p className="auth-sub" style={{ textAlign: 'center' }}>
          {emailOk ? (
            <>We sent a confirmation link to{' '}
            <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{email}</span>.
            Click the link to verify your account.</>
          ) : (
            <>We could not send the confirmation email to{' '}
            <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{email}</span>.
            Please use the Resend button below.</>
          )}
        </p>
        {!emailOk && (
          <div className="auth-error" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
            Confirmation email could not be sent. Try resending or check your email address.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="auth-btn"
            style={{ background: resent ? 'var(--vs-success,#059669)' : undefined }}
          >
            {resending ? <><span className="auth-spinner" /> Sending…</> : resent ? '✓ Email sent!' : 'Resend confirmation email'}
          </button>
          {resendError && (
            <div className="auth-error">
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
              {resendError}
            </div>
          )}
          <p className="auth-terms" style={{ textAlign: 'center', marginTop: 4 }}>
            Wrong email?{' '}
            <button
              type="button"
              onClick={() => {
                setSuccess(false)
                setFirstName(''); setLastName(''); setEmail(''); setPassword('')
                setResent(false)
              }}
              style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              Start over
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="auth-title">Create your account</div>
      <div className="auth-sub">Join 2,400+ creators. No credit card required.</div>

      {error && (
        <div className="auth-error">
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
          {error}
        </div>
      )}



      <form onSubmit={handleSubmit}>
        <div className="auth-frow">
          <div className="auth-fg">
            <label className="auth-label" htmlFor="firstName">First name</label>
            <input id="firstName" type="text" className="auth-input" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
          </div>
          <div className="auth-fg">
            <label className="auth-label" htmlFor="lastName">Last name</label>
            <input id="lastName" type="text" className="auth-input" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
          </div>
        </div>
        <div className="auth-fg">
          <label className="auth-label" htmlFor="email">Email address</label>
          <input id="email" type="email" className="auth-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="auth-fg">
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="auth-input" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          {password.length > 0 && (
            <div className="auth-pw-meter">
              <div className="auth-pw-bars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="auth-pw-bar"
                    style={{ background: i <= score ? strengthColor : undefined }}
                  />
                ))}
              </div>
              <span className="auth-pw-label" style={{ color: strengthColor }}>
                {getStrengthLabel(score)}
              </span>
            </div>
          )}
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? <><span className="auth-spinner" /> Creating account…</> : 'Create free account →'}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button type="button" className="auth-btn-g" onClick={handleGoogle}>
        {GOOGLE_SVG}
        Continue with Google
      </button>

      <div className="auth-terms">
        By signing up you agree to our{' '}
        <Link href="/terms">Terms</Link> &amp;{' '}
        <Link href="/privacy">Privacy Policy</Link>
      </div>
    </>
  )
}
