'use client'

import { useEffect, useCallback } from 'react'

interface Props {
  widgetId: string
  campaignUrl: string
  headline: string
  subtext: string
  ctaText: string
  theme: 'light' | 'dark'
  accentColor: string
  participantCount: number
}

export default function WidgetForm({
  widgetId,
  campaignUrl,
  headline,
  subtext,
  ctaText,
  theme,
  accentColor,
  participantCount,
}: Props) {
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

  // Apply accent color as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--wf-accent', accentColor)
    return () => { document.documentElement.style.removeProperty('--wf-accent') }
  }, [accentColor])

  const btnStyle = { background: accentColor } as React.CSSProperties
  const btnHoverBg = (() => {
    const hex = accentColor.replace('#', '')
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 20)
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 20)
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 20)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  function handleClick() {
    // Track click event (fire-and-forget)
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
      body: JSON.stringify({ widget_id: widgetId, event_type: 'click', referrer_domain: referrerDomain }),
    }).catch(() => {})

    window.parent.postMessage({ type: 'vs:click' }, '*')
    window.open(campaignUrl, '_blank')
  }

  return (
    <div className={`wf-root wf-${theme}`}>
      <div className="wf-card">
        <div className="wf-headline">{headline}</div>
        <div className="wf-subtext">{subtext}</div>

        {participantCount > 0 && (
          <div className="wf-social-proof">
            <span className="wf-sp-dot" style={{ background: accentColor }} />
            {participantCount.toLocaleString()} {participantCount === 1 ? 'person has' : 'people have'} joined
          </div>
        )}

        <button
          className="wf-btn"
          style={btnStyle}
          onClick={handleClick}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = btnHoverBg }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = accentColor }}
        >
          {ctaText}
        </button>

        <div className="wf-privacy">
          You&apos;ll be taken to the campaign page to join and get your ValueShare link.
        </div>

        <div className="wf-powered">Powered by ValueShare</div>
      </div>
    </div>
  )
}
