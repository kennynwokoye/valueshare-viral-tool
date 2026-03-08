'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CampaignWithTiers, EmbedWidget } from '@/types'

type WidgetTab = 'embed' | 'button' | 'floating' | 'popup' | 'qr'

interface Props {
  campaign: CampaignWithTiers
  onClose: () => void
}

interface WidgetAnalytics {
  views: number
  clicks: number
  submits: number
  conversionRate: number
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://valueshare.netlify.app'

const PLATFORMS = [
  {
    icon: '\u{1F310}',
    name: 'Any HTML website',
    desc: 'paste in a Custom HTML / Raw HTML block',
  },
  {
    icon: '\u{1F50C}',
    name: 'WordPress + Elementor',
    desc: 'add an HTML widget, paste the code inside',
  },
  {
    icon: '\u{1F529}',
    name: 'WordPress + Thrive Architect',
    desc: 'use a Custom HTML element in Text view',
  },
  {
    icon: '\u{1F30A}',
    name: 'Webflow',
    desc: 'use an Embed element in the Designer canvas',
  },
  {
    icon: '\u{1F500}',
    name: 'ClickFunnels / GoHighLevel',
    desc: 'add a Custom HTML element',
  },
  {
    icon: '\u{26A1}',
    name: 'Vibe-coded sites (Lovable, Bolt, v0)',
    desc: 'paste inside a JSX component as raw HTML or as the iframe src prop',
  },
  {
    icon: '\u{1F64F}',
    name: 'Thank You Page / Funnel',
    desc: 'add anywhere on your thank you page to capture fresh leads into your campaign',
  },
]

export default function WidgetBrowser({ campaign, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<WidgetTab>('embed')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  // Widget data (type-safe access)
  const widget: EmbedWidget | null = campaign.embed_widgets ?? null

  // Analytics state
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null)

  // Customization form state
  const [headline, setHeadline] = useState(widget?.widget_headline ?? '')
  const [subtext, setSubtext] = useState(widget?.widget_subtext ?? '')
  const [ctaText, setCtaText] = useState(widget?.widget_cta || 'Get Your Free Link \u2192')
  const [theme, setTheme] = useState<'light' | 'dark'>(widget?.widget_theme || 'light')
  const [accentColor, setAccentColor] = useState(widget?.widget_accent_color || '#e85d3a')
  const [successHeadline, setSuccessHeadline] = useState(widget?.widget_success_headline ?? '')
  const [successMessage, setSuccessMessage] = useState(widget?.widget_success_message ?? '')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Fetch analytics on mount
  useEffect(() => {
    if (!widget?.id) return
    let cancelled = false

    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/widgets/${widget!.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.analytics) {
          setAnalytics({
            views: data.analytics.views ?? 0,
            clicks: data.analytics.clicks ?? 0,
            submits: data.analytics.submits ?? 0,
            conversionRate: data.analytics.conversionRate ?? 0,
          })
        }
      } catch {
        // Silently fail — stats are non-critical
      }
    }

    fetchAnalytics()
    return () => { cancelled = true }
  }, [widget?.id])

  // ── Code generators ────────────────────────────────────

  const iframeCode = useCallback((): string => {
    const id = `vs-${widget?.widget_key}`
    return [
      `<iframe`,
      `  id="${id}"`,
      `  src="${APP_URL}/w/${widget?.widget_key}"`,
      '  width="100%"',
      '  height="420"',
      '  style="border:none;border-radius:8px;overflow:hidden;transition:height .2s ease"',
      `  title="${campaign.name}">`,
      '</iframe>',
      '<script>',
      'window.addEventListener("message",function(e){',
      `  if(e.data&&e.data.type==="vs:resize"){`,
      `    var f=document.getElementById("${id}");`,
      '    if(f)f.style.height=Math.ceil(e.data.height)+"px";',
      '  }',
      '});',
      '</script>',
    ].join('\n')
  }, [widget?.widget_key, campaign.name])

  const buttonCode = useCallback((): string => {
    return [
      '<a',
      `  href="${APP_URL}/w/${widget?.widget_key}/click"`,
      '  target="_blank"',
      `  style="display:inline-block;background:${accentColor};color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;font-family:sans-serif;">`,
      `  ${ctaText}`,
      '</a>',
    ].join('\n')
  }, [widget?.widget_key, accentColor, ctaText])

  const floatingCode = useCallback((): string => {
    const escapedCta = ctaText.replace(/'/g, "\\'")
    return [
      '<script>(function(){',
      "  var s=document.createElement('style');",
      `  s.textContent='.vs-fab{position:fixed;bottom:24px;right:24px;background:${accentColor};color:#fff;padding:14px 22px;border-radius:50px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:9999;display:block;transition:transform .15s}.vs-fab:hover{transform:translateY(-2px)}';`,
      '  document.head.appendChild(s);',
      "  var a=document.createElement('a');",
      `  a.href='${APP_URL}/w/${widget?.widget_key}/click';`,
      "  a.target='_blank';",
      "  a.className='vs-fab';",
      `  a.textContent='${escapedCta}';`,
      '  document.body.appendChild(a);',
      '})();',
      '<' + '/script>',
    ].join('\n')
  }, [widget?.widget_key, accentColor, ctaText])

  const popupCode = useCallback((): string => {
    const escapedCta = ctaText.replace(/'/g, "\\'")
    return [
      '<script>(function(){',
      '  function getCookie(n){var m=document.cookie.match(new RegExp("(^| )"+n+"=([^;]+)"));return m?m[2]:null}',
      '  if(getCookie("vs_popup_shown"))return;',
      '  setTimeout(function(){',
      '    if(getCookie("vs_popup_shown"))return;',
      "    document.cookie='vs_popup_shown=1;path=/;max-age=86400';",
      "    var ov=document.createElement('div');",
      `    ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center';`,
      "    var md=document.createElement('div');",
      `    md.style.cssText='position:relative;width:420px;max-width:90vw;height:440px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)';`,
      "    var cl=document.createElement('button');",
      `    cl.textContent='\\u00d7';`,
      `    cl.style.cssText='position:absolute;top:8px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:2';`,
      `    cl.onmouseover=function(){cl.style.color='${accentColor}'};`,
      "    cl.onmouseout=function(){cl.style.color='#666'};",
      "    cl.onclick=function(){ov.remove()};",
      "    var fr=document.createElement('iframe');",
      `    fr.src='${APP_URL}/w/${widget?.widget_key}';`,
      "    fr.style.cssText='border:none;width:100%;height:420px;transition:height .2s ease';",
      `    fr.title='${escapedCta}';`,
      '    md.appendChild(cl);',
      '    md.appendChild(fr);',
      '    ov.appendChild(md);',
      '    ov.onclick=function(e){if(e.target===ov)ov.remove()};',
      '    document.body.appendChild(ov);',
      '    window.addEventListener("message",function(e){',
      '      if(e.data&&e.data.type==="vs:resize"){fr.style.height=Math.ceil(e.data.height)+"px";md.style.height=(Math.ceil(e.data.height)+10)+"px";}',
      '    });',
      '  },5000);',
      '})();',
      '<' + '/script>',
    ].join('\n')
  }, [widget?.widget_key, accentColor, ctaText])

  function getCode(): string {
    if (activeTab === 'embed') return iframeCode()
    if (activeTab === 'button') return buttonCode()
    if (activeTab === 'floating') return floatingCode()
    if (activeTab === 'popup') return popupCode()
    return ''
  }

  async function handleCopy(text?: string) {
    try {
      await navigator.clipboard.writeText(text ?? getCode())
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2000)
    }
  }

  async function handleSaveCustomization() {
    if (!widget?.id) return
    setSaving(true)
    setSaveStatus('idle')

    try {
      const res = await fetch(`/api/widgets/${widget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_headline: headline || null,
          widget_subtext: subtext || null,
          widget_cta: ctaText,
          widget_theme: theme,
          widget_accent_color: accentColor,
          widget_success_headline: successHeadline || null,
          widget_success_message: successMessage || null,
        }),
      })

      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  // ── Tab definitions ────────────────────────────────────

  const tabs: { id: WidgetTab; icon: string; label: string }[] = [
    { id: 'embed', icon: '\u{1F4CB}', label: 'Inline Form' },
    { id: 'button', icon: '\u{1F517}', label: 'CTA Button' },
    { id: 'floating', icon: '\u{1F4CC}', label: 'Floating CTA' },
    { id: 'popup', icon: '\u{1F4AC}', label: 'Popup' },
    { id: 'qr', icon: '\u{1F4F1}', label: 'QR Code' },
  ]

  const tabDesc: Record<WidgetTab, string> = {
    embed: 'Embed a compact opt-in form directly on your page using an iframe.',
    button: 'A styled HTML link button that opens your campaign landing page.',
    floating: 'A fixed bottom-right button that floats on your page \u2014 add the script before </body>.',
    popup: 'A popup that appears after a delay or on exit intent. Add the script before </body>.',
    qr: 'Generate a QR code for your widget. Perfect for flyers, business cards, and events.',
  }

  // Derived values for previews
  const previewHeadline = headline || campaign.headline || 'Join & earn rewards'
  const previewSubtext = subtext || campaign.subheadline || ''
  const widgetUrl = `${APP_URL}/w/${widget?.widget_key}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(widgetUrl)}`

  // ── No-widget fallback ─────────────────────────────────

  if (!widget?.widget_key) {
    return (
      <div className="wb-overlay" onClick={onClose}>
        <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wb-header">
            <div className="wbm-title">{'\u{1F9E9}'} Widget Browser</div>
            <button className="wb-close" onClick={onClose}>{'\u2715'}</button>
          </div>
          <div className="wb-no-widget">
            No widget available for this campaign. Re-save the campaign to generate one.
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────

  return (
    <div className="wb-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wb-header">
          <div className="wbm-title">
            {'\u{1F9E9}'} Widget Browser — <span>&ldquo;{campaign.name}&rdquo;</span>
          </div>
          <button className="wb-close" onClick={onClose}>{'\u2715'}</button>
        </div>

        {/* Stats bar */}
        <div className="wb-stats">
          <div className="wb-stat">
            <div className="wb-stat-val">{analytics?.views ?? '\u2013'}</div>
            <div className="wb-stat-label">Views</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat-val">{analytics?.clicks ?? '\u2013'}</div>
            <div className="wb-stat-label">Clicks</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat-val">
              {analytics
                ? `${(analytics.conversionRate * 100).toFixed(1)}%`
                : '\u2013'}
            </div>
            <div className="wb-stat-label">Conversion Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="wb-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`wb-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(t.id); setCopied(false); setCopyError(false) }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="wb-body">
          <div className="wb-desc">{tabDesc[activeTab]}</div>

          {/* ── Embed preview ─────────────────────────── */}
          {activeTab === 'embed' && (
            <div className="wb-preview">
              <div className="wb-preview-label">Preview</div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', maxWidth: 340 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, letterSpacing: '-.02em' }}>
                  {'\u25C6'} Value<span style={{ color: accentColor }}>Share</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>
                  {previewHeadline}
                </div>
                {previewSubtext && (
                  <div style={{ fontSize: 11, color: '#78716c', marginBottom: 6 }}>
                    {previewSubtext}
                  </div>
                )}
                <div style={{ height: 30, background: '#f5f5f0', borderRadius: 5, border: '1px solid #e0ddd8', marginBottom: 8 }} />
                <div style={{ height: 34, background: accentColor, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{ctaText}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Button preview ────────────────────────── */}
          {activeTab === 'button' && (
            <div className="wb-preview">
              <div className="wb-preview-label">Preview</div>
              <div style={{ display: 'flex', padding: '8px 0' }}>
                <span style={{
                  display: 'inline-block', background: accentColor, color: '#ffffff',
                  padding: '14px 28px', borderRadius: 6, fontSize: 15, fontWeight: 600,
                  fontFamily: 'sans-serif', letterSpacing: '.01em',
                }}>
                  {ctaText}
                </span>
              </div>
            </div>
          )}

          {/* ── Floating preview ──────────────────────── */}
          {activeTab === 'floating' && (
            <div className="wb-preview" style={{ position: 'relative', minHeight: 80 }}>
              <div className="wb-preview-label">Preview</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8 }}>
                A floating button will appear at the bottom-right corner of your page.
              </div>
              <span style={{
                background: accentColor, color: '#fff', padding: '10px 18px',
                borderRadius: 50, fontSize: 12, fontWeight: 600, fontFamily: 'sans-serif',
                display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,.2)',
              }}>
                {ctaText}
              </span>
            </div>
          )}

          {/* ── Popup preview ─────────────────────────── */}
          {activeTab === 'popup' && (
            <div className="wb-preview">
              <div className="wb-preview-label">Preview</div>
              <div style={{
                background: '#e5e5e5', borderRadius: 8, padding: 12,
                position: 'relative', minHeight: 160,
              }}>
                {/* Mini browser chrome */}
                <div style={{
                  background: '#d4d4d4', borderRadius: '6px 6px 0 0', padding: '6px 10px',
                  display: 'flex', gap: 4, marginBottom: 0,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
                </div>
                <div style={{
                  background: '#fafafa', borderRadius: '0 0 6px 6px', minHeight: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  {/* Overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)',
                    borderRadius: '0 0 6px 6px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {/* Popup card */}
                    <div style={{
                      background: '#fff', borderRadius: 8, padding: '14px 16px',
                      width: 180, boxShadow: '0 8px 24px rgba(0,0,0,.2)', position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', top: 2, right: 6,
                        fontSize: 14, color: '#999', cursor: 'default',
                      }}>{'\u00D7'}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                        {previewHeadline}
                      </div>
                      {previewSubtext && (
                        <div style={{ fontSize: 8, color: '#78716c', marginBottom: 6 }}>
                          {previewSubtext}
                        </div>
                      )}
                      <div style={{
                        height: 18, background: '#f5f5f0', borderRadius: 3,
                        border: '1px solid #e0ddd8', marginBottom: 6,
                      }} />
                      <div style={{
                        height: 22, background: accentColor, borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>{ctaText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── QR Code section ───────────────────────── */}
          {activeTab === 'qr' && (
            <div className="wb-qr-wrap">
              <img
                className="wb-qr-img"
                src={qrImageUrl}
                alt={`QR code for ${campaign.name}`}
                width={300}
                height={300}
              />
              <div className="wb-qr-url">{widgetUrl}</div>
              <div className="wb-qr-actions">
                <a
                  href={qrImageUrl}
                  download={`valueshare-qr-${widget.widget_key}.png`}
                  className="wb-copy-btn"
                >
                  Download QR Code
                </a>
                <button
                  className={`wb-copy-btn${copied ? ' copied' : ''}`}
                  onClick={() => handleCopy(widgetUrl)}
                >
                  {copied ? '\u2713 Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}

          {/* ── Embed code (not shown for QR tab) ────── */}
          {activeTab !== 'qr' && (
            <div className="wb-code-section">
              <div className="wb-code-label">Embed code</div>
              <div className="wb-code-wrap">
                <pre className="wb-code">{getCode()}</pre>
              </div>
              <button
                className={`wb-copy-btn${copied ? ' copied' : ''}${copyError ? ' error' : ''}`}
                onClick={() => handleCopy()}
              >
                {copyError ? 'Failed to copy' : copied ? '\u2713 Copied!' : 'Copy code \u2192'}
              </button>
            </div>
          )}

          {/* ── Customize Widget accordion ────────────── */}
          <div className="wb-accordion">
            <div className="wb-accord-hd" onClick={() => setCustomizeOpen((v) => !v)}>
              <span>Customize Widget</span>
              <span>{customizeOpen ? '\u25B2' : '\u25BC'}</span>
            </div>
            {customizeOpen && (
              <div className="wb-accord-body">
                <div className="wb-cust-row">
                  <label className="wb-cust-label">Headline</label>
                  <input
                    className="vs-input"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder={campaign.headline || 'Join & earn rewards'}
                  />
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">Subtext</label>
                  <input
                    className="vs-input"
                    type="text"
                    value={subtext}
                    onChange={(e) => setSubtext(e.target.value)}
                    placeholder={campaign.subheadline || 'Share with friends to unlock rewards'}
                  />
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">CTA Text</label>
                  <input
                    className="vs-input"
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                  />
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">Theme</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`wb-theme-btn${theme === 'light' ? ' active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </button>
                    <button
                      className={`wb-theme-btn${theme === 'dark' ? ' active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink3)' }}>
                      {accentColor}
                    </span>
                  </div>
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">Success Headline</label>
                  <input
                    className="vs-input"
                    type="text"
                    value={successHeadline}
                    onChange={(e) => setSuccessHeadline(e.target.value)}
                    placeholder="Enter your code"
                  />
                </div>

                <div className="wb-cust-row">
                  <label className="wb-cust-label">Success Message</label>
                  <input
                    className="vs-input"
                    type="text"
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    placeholder="We sent a 6-digit code to your email"
                  />
                </div>

                <button
                  className="wb-save-btn"
                  onClick={handleSaveCustomization}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : saveStatus === 'success'
                      ? '\u2713 Saved!'
                      : saveStatus === 'error'
                        ? 'Error \u2014 try again'
                        : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* ── Platform instructions accordion ───────── */}
          <div className="wb-accordion">
            <div className="wb-accord-hd" onClick={() => setPlatformOpen((v) => !v)}>
              <span>How to add to your website</span>
              <span>{platformOpen ? '\u25B2' : '\u25BC'}</span>
            </div>
            {platformOpen && (
              <div className="wb-accord-body">
                {PLATFORMS.map((p) => (
                  <div key={p.name} className="wb-platform-row">
                    <div className="wb-platform-icon">{p.icon}</div>
                    <div className="wb-platform-text">
                      <strong>{p.name}</strong> — {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
