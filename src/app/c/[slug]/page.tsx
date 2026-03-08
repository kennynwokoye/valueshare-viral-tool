import React from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { RewardTier, HowItWorksStep, LandingConfig, LandingTemplate } from '@/types'
import { getLandingTemplate, mergeLandingConfig, getVideoEmbedUrl, getDefaultSectionOrder } from '@/lib/campaign-helpers'
import JoinForm from './JoinForm'
import CountdownTimer from './CountdownTimer'

interface Props {
  params: Promise<{ slug: string }>
}

/* ── Metadata (SEO) ─────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('campaigns')
    .select('headline, description, creator_display_name, hero_image_url')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Campaign Not Found' }

  return {
    title: `${data.headline} — ValueShare`,
    description: data.description || `Join ${data.creator_display_name}'s campaign on ValueShare`,
    openGraph: {
      title: data.headline,
      description: data.description || undefined,
      images: data.hero_image_url ? [data.hero_image_url] : undefined,
    },
  }
}

/* ── Helpers ─────────────────────────────────────────── */

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

/* ── Page ────────────────────────────────────────────── */

export default async function CampaignPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, reward_tiers(*)')
    .eq('slug', slug)
    .single()

  if (!campaign) notFound()

  /* Inactive state */
  if (campaign.status !== 'active') {
    return (
      <div className="cl-page">
        <div className="cl-container">
          <div className="cl-inactive">
            <div className="cl-inactive-icon">⏸️</div>
            <h2 className="cl-inactive-title">This campaign is no longer active.</h2>
            <p className="cl-inactive-sub">The creator may have paused or ended this campaign.</p>
          </div>
        </div>
      </div>
    )
  }

  /* Template config */
  const templateKey = (campaign.landing_template ?? 'starter') as LandingTemplate
  const templateDef = getLandingTemplate(templateKey)
  const config: Required<LandingConfig> = mergeLandingConfig(templateKey, (campaign.landing_config ?? {}) as LandingConfig)

  const tiers = ((campaign.reward_tiers ?? []) as RewardTier[]).sort(
    (a, b) => a.tier_order - b.tier_order
  )
  const mainReward = tiers[0] ?? null
  const howItWorks = (campaign.how_it_works ?? []) as HowItWorksStep[]
  const kpiLabel = campaign.kpi_type === 'registrations' ? 'signups' : campaign.kpi_type

  /* Video embed */
  const videoEmbedUrl = getVideoEmbedUrl(config.videoUrl ?? '')

  /* Build CSS variables from config */
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

  /* Show/hide sections */
  const showBenefits = config.showBenefits && campaign.benefits?.length > 0 && campaign.benefits.some((b: string) => b.trim())
  const showHowItWorks = config.showHowItWorks && howItWorks.length > 0
  const showCountdown = config.showCountdown && campaign.show_countdown && campaign.deadline
  const showSocialProof = config.showSocialProof && campaign.social_proof_visible && campaign.total_participants > 0

  /* Section order */
  const sectionOrder = (config.sectionOrder && config.sectionOrder.length > 0)
    ? config.sectionOrder
    : getDefaultSectionOrder(config.formPosition)

  /* ── Fixed sections (not reorderable) ── */

  const header = (
    <header className="cl-header">
      <div className="cl-creator-row">
        {campaign.creator_photo_url ? (
          <img src={campaign.creator_photo_url} alt="" className="cl-creator-photo" />
        ) : (
          <div className="cl-creator-avatar">
            {(campaign.creator_display_name || 'C')[0].toUpperCase()}
          </div>
        )}
        <span className="cl-creator-name">{campaign.creator_display_name}</span>
      </div>
      <div className="cl-powered">
        Powered by <strong>ValueShare</strong>
      </div>
    </header>
  )

  /* Fixed hero: tagline + headline + social proof only */
  const heroFixed = (
    <section className="cl-hero">
      {config.tagline && (
        <span className="cl-hero-tag">{config.tagline}</span>
      )}
      <h1 className="cl-headline">{campaign.headline}</h1>
      {showSocialProof && (
        <div className="cl-social-proof">
          <span className="cl-social-fire">&#x1F525;</span>{' '}
          {campaign.total_participants}{' '}
          {campaign.total_participants === 1 ? 'person has' : 'people have'}{' '}
          already joined
        </div>
      )}
    </section>
  )

  const footer = (
    <footer className="cl-footer">
      <strong>ValueShare</strong> &mdash; Viral referral campaigns made simple
    </footer>
  )

  /* ── Reorderable sections ── */

  const heroImageSection = campaign.hero_image_url ? (
    <div className="cl-hero-image">
      <img src={campaign.hero_image_url} alt="" />
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

  const subheadlineSection = campaign.subheadline ? (
    <div className="cl-subheadline-section">
      <p className="cl-subheadline">{campaign.subheadline}</p>
    </div>
  ) : null

  const descriptionSection = campaign.description ? (
    <div className="cl-description-section">
      <p className="cl-description">{campaign.description}</p>
    </div>
  ) : null

  const cta1Section = (
    <div className="cl-cta-block">
      <a href="#join">{config.ctaText || 'Get My Referral Link \u2192'}</a>
    </div>
  )

  const cta2Section = (
    <div className="cl-cta-block">
      <a href="#join">{config.cta2Text || config.ctaText || 'Get My Referral Link \u2192'}</a>
    </div>
  )

  const benefitsSection = showBenefits ? (
    <section className="cl-benefits">
      <h2 className="cl-section-title">What You Get</h2>
      <div className="cl-benefits-grid">
        {campaign.benefits
          .filter((b: string) => b.trim())
          .map((b: string, i: number) => (
            <div key={i} className="cl-benefit-card">
              <div className="cl-benefit-icon">{i + 1}</div>
              <div>
                <h3>{b}</h3>
              </div>
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
      {campaign.creator_photo_url ? (
        <img src={campaign.creator_photo_url} className="cl-creator-bio-photo" alt="" />
      ) : (
        <div className="cl-creator-bio-avatar">
          {(campaign.creator_display_name || 'C')[0].toUpperCase()}
        </div>
      )}
      <div className="cl-creator-bio-content">
        <p className="cl-creator-bio-name">{campaign.creator_display_name}</p>
        <p className="cl-creator-bio-text">{config.creatorBio}</p>
      </div>
    </div>
  ) : null

  const rewardSection = mainReward ? (
    <section className="cl-reward">
      <div className="cl-reward-body">
        <h3 className="cl-reward-title">{mainReward.reward_label}</h3>
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
          <div key={tier.id} className="cl-tier-step">
            <div className="cl-tier-dot-wrap">
              <div className="cl-tier-dot" />
              {i < tiers.length - 1 && <div className="cl-tier-line" />}
            </div>
            <div className="cl-tier-info">
              <div className="cl-tier-thresh">
                Get {tier.threshold} {kpiLabel}
              </div>
              <div className="cl-tier-label">
                {tier.label || tier.reward_label}
              </div>
              {tier.preview_teaser && (
                <div className="cl-tier-desc">{tier.preview_teaser}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null

  const countdownSection = showCountdown ? (
    <CountdownTimer deadline={campaign.deadline!} />
  ) : null

  /* Join section */
  const joinTitle = campaign.total_participants > 0
    ? `Join ${campaign.total_participants.toLocaleString()} ${campaign.total_participants === 1 ? 'person' : 'people'} & get your referral link`
    : 'Get your referral link'

  const joinSection = (
    <div id="join" className="cl-join-wrap">
      <p className="cl-join-wrap-title">{joinTitle}</p>
      <p className="cl-join-wrap-sub">You&apos;ll be sharing in under 60 seconds</p>
      <JoinForm campaignId={campaign.id} ctaText={config.ctaText} />
      <p className="cl-join-trust">&#x1F512; We won&apos;t spam you. Unsubscribe anytime.</p>
    </div>
  )

  /* Section map */
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

  /* ── Conference: split layout (form on right) ────── */
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
            <div id="join" className="cl-split-form">
              <p className="cl-join-wrap-title">{joinTitle}</p>
              <p className="cl-join-wrap-sub">You&apos;ll be sharing in under 60 seconds</p>
              <JoinForm campaignId={campaign.id} ctaText={config.ctaText} />
              <p className="cl-join-trust">&#x1F512; We won&apos;t spam you. Unsubscribe anytime.</p>
            </div>
          </div>
          {footer}
        </div>
      </div>
    )
  }

  /* ── Default / top: section order render loop ─────── */
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
