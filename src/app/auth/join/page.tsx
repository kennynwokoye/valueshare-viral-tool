'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OtpInput from '@/components/OtpInput'

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}

function JoinForm() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign')

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, campaign_id: campaignId }),
      })

      const data = await res.json()

      if (res.ok) {
        setStep('otp')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendOtp()
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp.join('') }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        window.location.href = data.magic_link || '/dashboard/participant'
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── EMAIL STEP ──────────────────────── */
  if (step === 'email') {
    return (
      <>
        <div className="auth-title">Participant access</div>
        <div className="auth-sub">Track your shares and claim your reward.</div>

        <div className="auth-code-pill">
          <div className="auth-cp-ico">&#128274;</div>
          <div>
            <div className="auth-cp-t">Enter your email address</div>
            <div className="auth-cp-s">We&apos;ll send you a 6-digit login code</div>
          </div>
        </div>

        {error && (
          <div className="auth-error">
            <span style={{ fontSize: 14, flexShrink: 0 }}>&#9888;</span>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit}>
          <div className="auth-fg">
            <label className="auth-label" htmlFor="email">Your email address</label>
            <input
              id="email" type="email" className="auth-input"
              placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || !email}>
            {loading ? <><span className="auth-spinner" /> Sending&hellip;</> : 'Send login code \u2192'}
          </button>
        </form>

        <div className="auth-terms" style={{ marginTop: 20 }}>
          Already have a campaign link? Enter your email above and we&apos;ll find your campaign automatically.
        </div>
      </>
    )
  }

  /* ── OTP STEP ────────────────────────── */
  return (
    <>
      <button
        type="button"
        onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError('') }}
        style={{
          background: 'none', border: 'none', color: 'var(--ink3)',
          fontFamily: 'var(--font-display)', fontSize: 12, cursor: 'pointer',
          padding: 0, marginBottom: 20,
        }}
      >
        &larr; Back
      </button>

      <div className="auth-title">Enter your code</div>
      <div className="auth-sub">
        We sent a 6-digit code to{' '}
        <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{email}</span>
      </div>

      {error && (
        <div className="auth-error">
          <span style={{ fontSize: 14, flexShrink: 0 }}>&#9888;</span>
          {error}
        </div>
      )}

      <form onSubmit={handleOtpSubmit}>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

        <button type="submit" className="auth-btn" disabled={loading || otp.some((d) => !d)}>
          {loading ? <><span className="auth-spinner" /> Verifying&hellip;</> : 'Verify & Enter Dashboard \u2192'}
        </button>

        <div className="auth-terms" style={{ marginTop: 20 }}>
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={() => { setOtp(['', '', '', '', '', '']); sendOtp() }}
            style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Resend
          </button>
        </div>
      </form>
    </>
  )
}
