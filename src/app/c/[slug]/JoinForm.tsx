'use client'

import { useState, useEffect } from 'react'
import OtpInput from '@/components/OtpInput'

export default function JoinForm({ campaignId, ctaText }: { campaignId: string; ctaText?: string }) {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingMs, setLoadingMs] = useState(0)

  // Track how long we've been loading so we can show a sub-message if slow
  useEffect(() => {
    if (!loading) { setLoadingMs(0); return }
    const start = Date.now()
    const id = setInterval(() => setLoadingMs(Date.now() - start), 500)
    return () => clearInterval(id)
  }, [loading])

  async function sendOtp() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), campaign_id: campaignId }),
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
    if (!email.trim()) { setError('Email is required'); return }
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
        body: JSON.stringify({
          email: email.trim(),
          code: otp.join(''),
          campaign_id: campaignId,
          name: name.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        window.location.href = data.magic_link
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 1: Email + name ───────────────────────────── */
  if (step === 'email') {
    return (
      <section className="cl-join">
        <form onSubmit={handleEmailSubmit} className="cl-join-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="vs-input cl-join-input"
            required
          />
          <input
            type="text"
            placeholder="First name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="vs-input cl-join-input"
          />
          {error && <div className="cl-join-error">{error}</div>}
          <button type="submit" disabled={loading} className="cl-join-btn">
            {loading ? 'Sending…' : (ctaText || 'Send my code \u2192')}
          </button>
          {loading && loadingMs > 3000 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 8, opacity: 0.8 }}>
              Still sending… this can take a few seconds
            </div>
          )}
        </form>
        <div className="cl-join-login">
          Already joined?{' '}
          <a href="/auth/join">Check your progress &rarr;</a>
        </div>
      </section>
    )
  }

  /* ── Step 2: OTP code ───────────────────────────────── */
  return (
    <section className="cl-join">
      <div className="cl-join-otp-hd">
        <div className="cl-join-otp-title">Check your inbox</div>
        <div className="cl-join-otp-sub">
          We sent a 6-digit code to <strong>{email}</strong>
        </div>
      </div>
      <form onSubmit={handleOtpSubmit} className="cl-join-form">
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        {error && <div className="cl-join-error">{error}</div>}
        <button type="submit" disabled={loading || otp.some((d) => !d)} className="cl-join-btn">
          {loading ? 'Verifying\u2026' : 'Verify & join \u2192'}
        </button>
      </form>
      <div className="cl-join-login">
        Didn&apos;t receive it?{' '}
        <button
          type="button"
          onClick={() => { setOtp(['', '', '', '', '', '']); sendOtp() }}
          style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          Resend
        </button>
        {' \u00b7 '}
        <button
          type="button"
          onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError('') }}
          style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          Change email
        </button>
      </div>
    </section>
  )
}
