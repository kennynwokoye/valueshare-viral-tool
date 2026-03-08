'use client'

import { useState } from 'react'

export default function JoinForm({ campaignId, ctaText }: { campaignId: string; ctaText?: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), campaign_id: campaignId }),
      })

      const data = await res.json()

      if (res.ok && data.magic_link) {
        window.location.href = data.magic_link
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="cl-join">
      <form onSubmit={handleSubmit} className="cl-join-form">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="vs-input cl-join-input"
          required
        />

        {error && <div className="cl-join-error">{error}</div>}
        <button type="submit" disabled={loading} className="cl-join-btn">
          {loading ? 'Joining...' : (ctaText || 'Get My Referral Link \u2192')}
        </button>
      </form>
      <div className="cl-join-login">
        Already joined?{' '}
        <a href="/auth/join">Check your progress &rarr;</a>
      </div>
    </section>
  )
}
