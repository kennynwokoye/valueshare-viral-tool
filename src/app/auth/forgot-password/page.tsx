'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">&#9993;</div>
        <div className="auth-title" style={{ textAlign: 'center' }}>Check your inbox</div>
        <p className="auth-sub" style={{ textAlign: 'center' }}>
          We sent a password reset link to{' '}
          <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{email}</span>.
          Click the link to set a new password.
        </p>
        <p className="auth-terms">
          <Link href="/auth/login">Back to login</Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="auth-title">Reset your password</div>
      <div className="auth-sub">
        Enter your email and we&apos;ll send you a reset link.
      </div>

      {error && (
        <div className="auth-error">
          <span style={{ fontSize: 14, flexShrink: 0 }}>&#9888;</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="auth-fg">
          <label className="auth-label" htmlFor="email">Email address</label>
          <input
            id="email" type="email" className="auth-input"
            placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading || !email}>
          {loading ? <><span className="auth-spinner" /> Sending&hellip;</> : 'Send reset link \u2192'}
        </button>
      </form>

      <div className="auth-terms" style={{ marginTop: 20 }}>
        Remember your password? <Link href="/auth/login">Sign in</Link>
      </div>
    </>
  )
}
