'use client'
import React from 'react'
import { getLandingTemplate, mergeLandingConfig, getVideoEmbedUrl, getDefaultSectionOrder } from '@/lib/campaign-helpers'
import type { CreateCampaignPayload, LandingConfig, LandingTemplate, HowItWorksStep } from '@/types'

/* ── Helpers (same as page.tsx) ──────────────────────── */

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function computeSurfaceColor(bg: string): string {
  const h = bg.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (lum < 0.3) return `rgba(255,255,255,0.05)`
  if (lum < 0.5) return `rgba(255,255,255,0.08)`
  return '#ffffff'
}

function computeMutedColor(text: string, bg: string): string {
  const h = bg.replace('#', '')
  const lum = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255
  if (lum < 0.4) {
    return text === '#e2e8f0' ? '#94a3b8' : text === '#f8f5ff' ? '#a78bfa' : text === '#e0f2fe' ? '#7dd3fc' : '#a8a29e'
  }
  return '#57534e'
}

function computeFaintColor(bg: string): string {
  const h = bg.replace('#', '')
  const lum = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255
  return lum < 0.4 ? 'rgba(255,255,255,0.35)' : '#a8a29e'
}

/* ── Component ───────────────────────────────────────── */

interface Props {
  data: Partial<CreateCampaignPayload>
}

export default function CampaignPreview({ data }: Props) {
  const templateKey = (data.landing_template || 'starter') as LandingTemplate
  const templateDef = getLandingTemplate(templateKey)
  const config: Required<LandingConfig> = mergeLandingConfig(templateKey, (data.landing_config || {}) as LandingConfig)

  const tiers = (data.reward_tiers ?? []).slice().sort((a, b) => a.tier_order - b.tier_order)
  const mainReward = tiers[0] ?? null
  const howItWorks = (data.how_it_works ?? []) as HowItWorksStep[]
  const kpiLabel = data.kpi_type === 'registrations' ? 'signups' : (data.kpi_type || 'clicks')

  /* Video */
  const videoEmbedUrl = getVideoEmbedUrl(config.videoUrl ?? '')

  /* CSS vars */
  const cssVars = `
    .cl-page {
      --cl-accent: ${config.accentColor};
      --cl-accent-rgb: ${hexToRgb(config.accentColor)};
      --cl-bg: ${config.bgColor};
      --cl-text: ${config.textColor};
      --cl-text-muted: ${computeMutedColor(config.textColor, config.bgColor)};
      --cl-text-faint: ${computeFaintColor(config.bgColor)};
      --cl-surface: ${computeSurfaceColor(config.bgColor)};
      --cl-surface-border: rgba(${hexToRgb(config.accentColor)}, 0.1);
      --cl-heading-font: var(--font-${config.headingFont === 'lora' ? 'serif' : 'display'});
      --cl-countdown-bg: ${config.textColor};
    }
  `

  /* Show/hide */
  const showBenefits = config.showBenefits && (data.benefits?.length ?? 0) > 0 && data.benefits!.some((b) => b.trim())
  const showHowItWorks = config.showHowItWorks && howItWorks.length > 0
  const showSocialProof = config.showSocialProof && false // preview: never show count
  const showCountdown = config.showCountdown && !!data.show_countdown && !!data.deadline

  /* Section order */
  const sectionOrder = config.sectionOrder && config.sectionOrder.length > 0
    ? config.sectionOrder
    : getDefaultSectionOrder(config.formPosition)

  /* ── Fixed sections ── */

  const creatorName = data.creator_display_name || 'Your Name'
  const creatorPhoto = data.creator_photo_url

  const header = (
    <header className="cl-header">
      <div className="cl-creator-row">
        {creatorPhoto ? (
          <img src={creatorPhoto} alt="" className="cl-creator-photo" />
        ) : (
          <div className="cl-creator-avatar">
            {creatorName[0].toUpperCase()}
          </div>
        )}
        <span className="cl-creator-name">{creatorName}</span>
      </div>
      <div className="cl-powered">
        Powered by <strong>ValueShare</strong>
      </div>
    </header>
  )

  const heroFixed = (
    <section className="cl-hero">
      {config.tagline && (
        <span className="cl-hero-tag">{config.tagline}</span>
      )}
      <h1 className="cl-headline">{data.headline || 'Your Headline Here'}</h1>
      {showSocialProof && null}
    </section>
  )

  const footer = (
    <footer className="cl-footer">
      <strong>ValueShare</strong> &mdash; Viral referral campaigns made simple
    </footer>
  )

  /* ── Reorderable sections ── */

  const heroImageSection = data.hero_image_url ? (
    <div className="cl-hero-image">
      <img src={data.hero_image_url} alt="" />
    </div>
  ) : null

  const videoSection = videoEmbedUrl ? (
    <section className="cl-video">
      <h2 className="cl-video-title">{config.videoTitle || 'Watch This First'}</h2>
      <div className="cl-video-embed">
        <iframe
          src={videoEmbedUrl}
          allowFullScreen
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </section>
  ) : null

  const subheadlineSection = data.subheadline ? (
    <div className="cl-subheadline-section">
      <p className="cl-subheadline">{data.subheadline}</p>
    </div>
  ) : null

  const descriptionSection = data.description ? (
    <div className="cl-description-section">
      <p className="cl-description">{data.description}</p>
    </div>
  ) : null

  const cta1Section = (
    <div className="cl-cta-block">
      <a href="#join-preview">{config.ctaText || 'Get My Referral Link →'}</a>
    </div>
  )

  const cta2Section = (
    <div className="cl-cta-block">
      <a href="#join-preview">{config.cta2Text || config.ctaText || 'Get My Referral Link →'}</a>
    </div>
  )

  const benefitsSection = showBenefits ? (
    <section className="cl-benefits">
      <h2 className="cl-section-title">What You Get</h2>
      <div className="cl-benefits-grid">
        {data.benefits!.filter((b) => b.trim()).map((b, i) => (
          <div key={i} className="cl-benefit-card">
            <div className="cl-benefit-icon">{i + 1}</div>
            <div><h3>{b}</h3></div>
          </div>
        ))}
      </div>
    </section>
  ) : null

  const howSection = showHowItWorks ? (
    <section className="cl-how">
      <h2 className="cl-section-title">How It Works</h2>
      <div className="cl-how-grid">
        {howItWorks.map((s, i) => (
          <div key={i} className="cl-how-card">
            <div className="cl-how-num">{s.step}</div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  const faqsSection = config.faqs && config.faqs.length > 0 ? (
    <section className="cl-faq">
      <h2 className="cl-section-title">Frequently Asked Questions</h2>
      <div className="cl-faq-list">
        {config.faqs.map((faq, i) => (
          <details key={i} className="cl-faq-item">
            <summary>{faq.question}</summary>
            <p className="cl-faq-answer">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  ) : null

  const creatorBioSection = config.creatorBio ? (
    <div className="cl-creator-bio">
      {creatorPhoto ? (
        <img src={creatorPhoto} className="cl-creator-bio-photo" alt="" />
      ) : (
        <div className="cl-creator-bio-avatar">
          {creatorName[0].toUpperCase()}
        </div>
      )}
      <div className="cl-creator-bio-content">
        <p className="cl-creator-bio-name">{creatorName}</p>
        <p className="cl-creator-bio-text">{config.creatorBio}</p>
      </div>
    </div>
  ) : null

  const rewardSection = mainReward ? (
    <section className="cl-reward">
      <div className="cl-reward-body">
        <h3 className="cl-reward-title">{mainReward.reward_label || 'Your Reward'}</h3>
        {mainReward.preview_teaser && (
          <p className="cl-reward-teaser">{mainReward.preview_teaser}</p>
        )}
        <div className="cl-reward-lock">
          <span className="cl-reward-lock-icon">&#x1F512;</span>
          Share to unlock &mdash; Get {mainReward.threshold} {kpiLabel} to claim
        </div>
      </div>
    </section>
  ) : null

  const tiersSection = tiers.length > 1 ? (
    <section className="cl-tiers">
      <h3 className="cl-section-title">Reward Levels</h3>
      <div className="cl-tier-ladder">
        {tiers.map((tier, i) => (
          <div key={i} className="cl-tier-step">
            <div className="cl-tier-dot-wrap">
              <div className="cl-tier-dot" />
              {i < tiers.length - 1 && <div className="cl-tier-line" />}
            </div>
            <div className="cl-tier-info">
              <div className="cl-tier-thresh">Get {tier.threshold} {kpiLabel}</div>
              <div className="cl-tier-label">{tier.label || tier.reward_label}</div>
              {tier.preview_teaser && <div className="cl-tier-desc">{tier.preview_teaser}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null

  const countdownSection = showCountdown ? (
    <div className="cl-countdown">
      <div className="cl-countdown-label">Offer ends in</div>
      <div className="cl-countdown-units">
        <div className="cl-countdown-unit"><span className="cl-countdown-num">07</span><span className="cl-countdown-unit-label">days</span></div>
        <div className="cl-countdown-unit"><span className="cl-countdown-num">12</span><span className="cl-countdown-unit-label">hrs</span></div>
        <div className="cl-countdown-unit"><span className="cl-countdown-num">30</span><span className="cl-countdown-unit-label">min</span></div>
        <div className="cl-countdown-unit"><span className="cl-countdown-num">00</span><span className="cl-countdown-unit-label">sec</span></div>
      </div>
    </div>
  ) : null

  /* Static join form mockup */
  const joinSection = (
    <div id="join-preview" className="cl-join-wrap">
      <p className="cl-join-wrap-title">Get your referral link</p>
      <p className="cl-join-wrap-sub">You&apos;ll be sharing in under 60 seconds</p>
      {/* Static mockup — no actual form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        <div style={{ padding: '10px 14px', border: '1.5px solid rgba(var(--cl-accent-rgb),0.3)', borderRadius: '9px', fontSize: '14px', color: 'var(--cl-text-muted)', background: 'var(--cl-surface)' }}>
          your@email.com
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center', background: 'var(--cl-accent)', color: '#fff', borderRadius: '9px', fontWeight: 700, fontSize: '15px', fontFamily: 'var(--cl-heading-font)' }}>
          {config.ctaText || 'Get My Referral Link →'}
        </div>
      </div>
      <p className="cl-join-trust">&#x1F512; We won&apos;t spam you. Unsubscribe anytime.</p>
    </div>
  )

  const sectionMap: Record<string, React.ReactNode> = {
    hero_image: heroImageSection,
    video: videoSection,
    subheadline: subheadlineSection,
    description: descriptionSection,
    cta1: cta1Section,
    benefits: benefitsSection,
    cta2: cta2Section,
    how_it_works: howSection,
    faqs: faqsSection,
    creator_bio: creatorBioSection,
    reward: rewardSection,
    tiers: tiersSection,
    countdown: countdownSection,
    join_form: joinSection,
  }

  /* Split layout */
  if (config.formPosition === 'right') {
    const leftSections = sectionOrder.filter((k) => k !== 'join_form')
    return (
      <div className={`cl-page ${templateDef.layoutClass}`}>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        <div className="cl-container">
          {header}
          {heroFixed}
          <div className="cl-split">
            <div className="cl-split-content">
              {leftSections.map((key) => (
                <React.Fragment key={key}>{sectionMap[key]}</React.Fragment>
              ))}
            </div>
            <div id="join-preview" className="cl-split-form">
              <p className="cl-join-wrap-title">Get your referral link</p>
              <p className="cl-join-wrap-sub">You&apos;ll be sharing in under 60 seconds</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
                <div style={{ padding: '10px 14px', border: '1.5px solid rgba(var(--cl-accent-rgb),0.3)', borderRadius: '9px', fontSize: '14px', color: 'var(--cl-text-muted)', background: 'var(--cl-surface)' }}>
                  your@email.com
                </div>
                <div style={{ padding: '12px 0', textAlign: 'center', background: 'var(--cl-accent)', color: '#fff', borderRadius: '9px', fontWeight: 700, fontSize: '15px' }}>
                  {config.ctaText || 'Get My Referral Link →'}
                </div>
              </div>
              <p className="cl-join-trust">&#x1F512; We won&apos;t spam you. Unsubscribe anytime.</p>
            </div>
          </div>
          {footer}
        </div>
      </div>
    )
  }

  return (
    <div className={`cl-page ${templateDef.layoutClass}`}>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div className="cl-container">
        {header}
        {heroFixed}
        {sectionOrder.map((key) => (
          <React.Fragment key={key}>{sectionMap[key]}</React.Fragment>
        ))}
        {footer}
      </div>
    </div>
  )
}
