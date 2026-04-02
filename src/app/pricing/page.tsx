import type { Metadata } from 'next'
import Link from 'next/link'
import NavAuth from '@/components/NavAuth'
import MobileNav from '@/components/MobileNav'

export const metadata: Metadata = {
  title: 'Pricing — ValueShare',
  description: 'Simple, transparent pricing for reward-powered growth campaigns. Start free, scale as you grow.',
}

const PLANS = [
  {
    name: 'Starter',
    tagline: 'For solo creators testing reward-powered growth',
    price: 'Free',
    priceSub: 'to start',
    highlight: false,
    features: [
      '1 active campaign',
      'Up to 500 participants',
      'Unique referral links',
      'Automatic reward delivery',
      'Basic analytics',
      'File & URL reward types',
      'Standard fraud detection',
    ],
    cta: 'Start for free',
    ctaHref: '/auth/signup',
    ctaStyle: 'outline' as const,
  },
  {
    name: 'Growth',
    tagline: 'For active launchers and serious marketers',
    price: 'Coming soon',
    priceSub: '',
    highlight: true,
    features: [
      'Up to 5 active campaigns',
      'Unlimited participants',
      'Advanced analytics & sources',
      'Geographic performance data',
      'Full fraud controls & shield',
      'Custom accent colors & branding',
      'Marketplace listing',
      'All reward types (file, video, call, URL)',
      'Priority email support',
    ],
    cta: 'Join waitlist',
    ctaHref: '/auth/signup',
    ctaStyle: 'coral' as const,
  },
  {
    name: 'Scale',
    tagline: 'For teams, agencies, and multi-brand operators',
    price: 'Coming soon',
    priceSub: '',
    highlight: false,
    features: [
      'Unlimited active campaigns',
      'Unlimited participants',
      'Team seats',
      'Multi-campaign analytics dashboard',
      'Advanced fraud reporting',
      'Custom integrations',
      'Priority support',
      'Advanced reward delivery options',
    ],
    cta: 'Contact us',
    ctaHref: '/auth/signup',
    ctaStyle: 'outline' as const,
  },
]

const VALUE_PROPS = [
  { icon: '🎯', label: 'Campaign-based pricing', desc: 'Pay for what you need. Scale up when your campaigns take off.' },
  { icon: '🛡️', label: 'Fraud controls included', desc: 'Every plan includes fraud detection. Only real results count.' },
  { icon: '⚡', label: 'Auto reward delivery', desc: 'Rewards deliver automatically the moment milestones are hit.' },
  { icon: '📊', label: 'Real results tracked', desc: 'Clicks, leads, and registrations — tied to real business goals.' },
]

export default function PricingPage() {
  return (
    <>
      <nav className="hp-nav">
        <Link href="/" className="hp-logo">
          <div className="hp-logo-ic">◆</div>
          ValueShare
        </Link>
        <div className="nav-c">
          <Link href="/marketplace">Marketplace</Link>
          <a href="/#how">How it works</a>
          <a href="/#features">Features</a>
          <Link href="/pricing" style={{ color: 'var(--coral)' }}>Pricing</Link>
        </div>
        <MobileNav />
        <NavAuth />
      </nav>

      {/* Hero */}
      <div className="pr-hero">
        <div className="eyebrow" style={{ justifyContent: 'center' }}>
          <div className="eyebrow-line" />Pricing
        </div>
        <h1 className="hp-h1" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 16px' }}>
          Growth software priced for<br />
          <span className="accent">how you actually grow</span>
        </h1>
        <p className="sub" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
          Start free. Launch your first campaign. Upgrade when you&apos;re ready to scale.
        </p>

        {/* Plans */}
        <div className="pr-plans">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`pr-plan${plan.highlight ? ' pr-plan--featured' : ''}`}>
              {plan.highlight && <div className="pr-badge">Most popular</div>}
              <div className="pr-plan-name">{plan.name}</div>
              <div className="pr-plan-tag">{plan.tagline}</div>
              <div className="pr-price">
                <span className="pr-price-val">{plan.price}</span>
                {plan.priceSub && <span className="pr-price-sub">{plan.priceSub}</span>}
              </div>
              <Link
                href={plan.ctaHref}
                className={plan.ctaStyle === 'coral' ? 'btn-coral pr-cta' : 'btn-line pr-cta'}
              >
                {plan.cta} →
              </Link>
              <ul className="pr-feats">
                {plan.features.map((f) => (
                  <li key={f} className="pr-feat">
                    <span className="pr-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Value props */}
      <div className="sec" style={{ paddingTop: 0 }}>
        <h2 className="hp-h2" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="serif">Every plan</span> gives you the core tools
        </h2>
        <div className="pr-vps">
          {VALUE_PROPS.map((vp) => (
            <div key={vp.label} className="pr-vp">
              <div className="pr-vp-ico">{vp.icon}</div>
              <div className="pr-vp-label">{vp.label}</div>
              <p className="pr-vp-desc">{vp.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ-style positioning note */}
      <div className="pr-note-wrap">
        <div className="pr-note">
          <div className="pr-note-title">This is growth infrastructure, not a free widget.</div>
          <p className="pr-note-body">
            ValueShare is built to help digital businesses acquire attention, signups, and customers by turning
            existing value into structured campaigns. The Starter plan is free so you can validate the approach.
            Growth and Scale plans are designed for businesses where referral campaigns become a core acquisition channel.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-wrap" style={{ marginTop: 0 }}>
        <div className="cta-inner">
          <div className="cta-l">
            <h2 className="hp-h2">
              If you already have value,<br />
              you already have{' '}
              <span className="serif-em" style={{ color: 'var(--coral)' }}>fuel for growth</span>
            </h2>
            <p>Launch your first campaign today. Free to start, no credit card required.</p>
          </div>
          <div className="cta-r">
            <Link href="/auth/signup" className="btn-wh2">Create your first campaign →</Link>
            <div className="cta-note">Free to start · No credit card required</div>
          </div>
        </div>
      </div>

      <footer className="hp-footer">
        <div className="f-logo">
          <div className="f-logo-ic">◆</div>
          ValueShare
        </div>
        <div className="f-copy">© 2026 ValueShare. All rights reserved.</div>
      </footer>
    </>
  )
}
