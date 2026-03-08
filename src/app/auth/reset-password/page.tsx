'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      router.push('/dashboard/creator')
    }, 2000)
  }

  if (success) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">&#10003;</div>
        <div className="auth-title" style={{ textAlign: 'center' }}>Password updated!</div>
        <p className="auth-sub" style={{ textAlign: 'center' }}>
          Your password has been changed. Redirecting to your dashboard&hellip;
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="auth-title">Set new password</div>
      <div className="auth-sub">Choose a strong password for your account.</div>

      {error && (
        <div className="auth-error">
          <span style={{ fontSize: 14, flexShrink: 0 }}>&#9888;</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="auth-fg">
          <label className="auth-label" htmlFor="password">New password</label>
          <input
            id="password" type="password" className="auth-input"
            placeholder="Min. 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" required
          />
        </div>
        <div className="auth-fg">
          <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword" type="password" className="auth-input"
            placeholder="Repeat your password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password" required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading || !password || !confirmPassword}>
          {loading ? <><span className="auth-spinner" /> Updating&hellip;</> : 'Update password \u2192'}
        </button>
      </form>
    </>
  )
}
