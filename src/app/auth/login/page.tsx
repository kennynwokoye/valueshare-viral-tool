'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const GOOGLE_SVG = (
  <svg width="15" height="15" viewBox="0 0 16 16">
    <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="#4285F4" />
    <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.72.48-1.63.76-2.71.76-2.08 0-3.85-1.41-4.48-3.3H.86v2.07A8 8 0 008 16z" fill="#34A853" />
    <path d="M3.52 9.51A4.8 4.8 0 013.27 8c0-.52.09-1.03.25-1.51V4.42H.86A8 8 0 000 8c0 1.29.31 2.51.86 3.58l2.66-2.07z" fill="#FBBC05" />
    <path d="M8 3.18c1.17 0 2.22.4 3.05 1.2l2.28-2.28A8 8 0 00.86 4.42L3.52 6.49C4.15 4.6 5.92 3.18 8 3.18z" fill="#EA4335" />
  </svg>
)

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard/creator'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : authError.message
      )
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + `/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
  }

  return (
    <>
      <div className="auth-title">Welcome back</div>
      <div className="auth-sub">Good to see you again.</div>

      {error && (
        <div className="auth-error">
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
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
        <div className="auth-fg">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password" type="password" className="auth-input"
            placeholder="Your password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required
          />
        </div>
        <div style={{ textAlign: 'right', marginTop: 4, marginBottom: -8 }}>
          <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--coral)', textDecoration: 'none' }}>
            Forgot your password?
          </Link>
        </div>

        <button type="submit" className="auth-btn" disabled={loading || !email || !password}>
          {loading ? <><span className="auth-spinner" /> Signing in…</> : 'Sign in →'}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button type="button" className="auth-btn-g" onClick={handleGoogle}>
        {GOOGLE_SVG}
        Sign in with Google
      </button>

      <div className="auth-terms">
        New to ValueShare?{' '}
        <Link href="/auth/signup">Create a free account</Link>
      </div>
    </>
  )
}
