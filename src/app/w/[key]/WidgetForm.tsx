'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  campaignId: string
  widgetId: string
  headline: string
  subtext: string
  ctaText: string
  theme: 'light' | 'dark'
  accentColor: string
  successHeadline: string | null
  successMessage: string | null
  participantCount: number
  prefillEmail?: string
}

export default function WidgetForm({
  campaignId,
  widgetId,
  headline,
  subtext,
  ctaText,
  theme,
  accentColor,
  successHeadline,
  successMessage,
  participantCount,
  prefillEmail,
}: Props) {
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [referralCode, setReferralCode] = useState('')
  const [referralUrl, setReferralUrl] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Send current page height to parent iframe for auto-resize
  const sendHeight = useCallback(() => {
    window.parent.postMessage(
      { type: 'vs:resize', height: document.documentElement.scrollHeight },
      '*'
    )
  }, [])

  // On mount: notify parent of view, start height sync
  useEffect(() => {
    window.parent.postMessage({ type: 'vs:view' }, '*')
    sendHeight()
    window.addEventListener('resize', sendHeight)
    return () => window.removeEventListener('resize', sendHeight)
  }, [sendHeight])

  // Re-sync height whenever content changes (step or error)
  useEffect(() => {
    const t = setTimeout(sendHeight, 60)
    return () => clearTimeout(t)
  }, [step, error, sendHeight])

  // Apply accent color as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--wf-accent', accentColor)
    return () => { document.documentElement.style.removeProperty('--wf-accent') }
  }, [accentColor])

  // Track widget event (fire-and-forget)
  function trackEvent(eventType: 'submit') {
    const referrerDomain = (() => {
      try {
        return window.top !== window.self
          ? document.referrer ? new URL(document.referrer).hostname : null
          : window.location.hostname
      } catch { return null }
    })()
    fetch('/api/widgets/' + widgetId + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widget_id: widgetId, event_type: eventType, referrer_domain: referrerDomain }),
    }).catch(() => {})
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true)
    setError('')

    // Notify parent of submit attempt
    window.parent.postMessage({ type: 'vs:submit', email: email.trim() }, '*')

    try {
      const res = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), campaign_id: campaignId }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        trackEvent('submit')
        setReferralCode(data.referral_code ?? '')
        setReferralUrl(data.referral_url ?? '')
        setMagicLink(data.magic_link ?? '')
        setStep('success')
        // Notify parent of successful join
        window.parent.postMessage({
          type: 'vs:joined',
          email: email.trim(),
          referralCode: data.referral_code,
          referralUrl: data.referral_url,
        }, '*')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl)
    } catch {
      // Fallback for non-HTTPS / older browser contexts
      const ta = document.createElement('textarea')
      ta.value = referralUrl
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const btnStyle = { background: accentColor } as React.CSSProperties
  const btnHoverBg = (() => {
    const hex = accentColor.replace('#', '')
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 20)
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 20)
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 20)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  // ── Success state ─────────────────────────────────────

  if (step === 'success') {
    const shareUrl = encodeURIComponent(referralUrl)
    const shareText = encodeURIComponent("I just joined — use my link to get in!")
    return (
      <div className={`wf-root wf-${theme}`}>
        <div className="wf-card">
          <div className="wf-logo">&#9670; Value<span style={{ color: accentColor }}>Share</span></div>
          <div className="wf-success-icon">&#127881;</div>
          <div className="wf-success-title">{successHeadline || "You're in!"}</div>
          <div className="wf-success-sub">
            {successMessage || 'Share your link to start earning rewards.'}
          </div>

          <div className="wf-ref-label">Your referral link</div>
          <div className="wf-ref-box">
            <span className="wf-ref-url">{referralUrl}</span>
          </div>

          <button
            className={`wf-copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            style={copied ? undefined : btnStyle}
            onMouseEnter={(e) => { if (!copied) (e.target as HTMLElement).style.background = btnHoverBg }}
            onMouseLeave={(e) => { if (!copied) (e.target as HTMLElement).style.background = accentColor }}
          >
            {copied ? '\u2713 Copied!' : 'Copy Link'}
          </button>

          <div className="wf-share-row">
            <a
              className="wf-share-btn"
              href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share on X"
            >
              𝕏
            </a>
            <a
              className="wf-share-btn"
              href={`https://wa.me/?text=${encodeURIComponent('Join me: ' + referralUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share on WhatsApp"
            >
              &#128172;
            </a>
            <a
              className="wf-share-btn"
              href={`mailto:?subject=You%27ve%20been%20invited&body=${encodeURIComponent('Use my referral link to join: ' + referralUrl)}`}
              title="Share via Email"
            >
              &#9993;
            </a>
          </div>

          {magicLink && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <a
                href={magicLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: accentColor, textDecoration: 'none', opacity: 0.8 }}
              >
                View my dashboard &rarr;
              </a>
            </div>
          )}

          <div className="wf-powered">Powered by ValueShare</div>
        </div>
      </div>
    )
  }

  // ── Form state ────────────────────────────────────────

  return (
    <div className={`wf-root wf-${theme}`}>
      <div className="wf-card">
        <div className="wf-logo">&#9670; Value<span style={{ color: accentColor }}>Share</span></div>
        <div className="wf-headline">{headline}</div>
        <div className="wf-subtext">{subtext}</div>

        {participantCount > 0 && (
          <div className="wf-social-proof">
            <span className="wf-sp-dot" style={{ background: accentColor }} />
            {participantCount.toLocaleString()} {participantCount === 1 ? 'person has' : 'people have'} joined
          </div>
        )}

        <form onSubmit={handleSubmit} className="wf-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="wf-input"
            required
            autoComplete="email"
          />
          {error && <div className="wf-error">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="wf-btn"
            style={btnStyle}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = btnHoverBg }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = accentColor }}
          >
            {loading ? 'Joining\u2026' : ctaText}
          </button>
        </form>

        <div className="wf-privacy">
          By joining you agree to share your email with the campaign organiser.
        </div>

        <div className="wf-powered">Powered by ValueShare</div>
      </div>
    </div>
  )
}
