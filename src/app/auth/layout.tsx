'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const SLIDES = [
  {
    eyebrow: 'REVENUE GROWTH',
    headline: (
      <>Turn every customer into a <span className="em">revenue channel</span></>
    ),
    body: 'Launch viral referral campaigns in minutes. Track every share, click and conversion with real-time analytics.',
    stats: [
      { val: '312%', lbl: 'Avg ROI' },
      { val: '47K+', lbl: 'Active Creators' },
      { val: '2.4M', lbl: 'Referrals Sent' },
    ],
  },
  {
    eyebrow: 'CREATOR SUCCESS',
    headline: (
      <>Creators earn <span className="em-g">$2,400/mo</span> on average</>
    ),
    body: 'Our top creators build passive income streams through their audience. No upfront cost, just share and earn.',
    testimonial: {
      stars: '★★★★★',
      quote: '"ValueShare transformed my newsletter into a revenue machine. I earned $3,200 last month from referrals alone."',
      name: 'Sarah Chen',
      role: 'Newsletter Creator • 45K subs',
      color: '#e85d3a',
      initials: 'SC',
    },
  },
  {
    eyebrow: 'PLATFORM SCALE',
    headline: (
      <>Built for <span className="em">scale</span>, designed for growth</>
    ),
    body: 'Enterprise-grade infrastructure with real-time tracking, fraud detection and automatic payouts.',
    stats: [
      { val: '99.9%', lbl: 'Uptime SLA' },
      { val: '<50ms', lbl: 'Track Latency' },
      { val: '150+', lbl: 'Countries' },
    ],
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000)
    return () => clearInterval(timer)
  }, [])

  const tabs = [
    { label: 'Creator Sign Up', href: '/auth/signup' },
    { label: 'Creator Login', href: '/auth/login' },
    { label: 'Participant', href: '/auth/join' },
  ]

  return (
    <div className="auth-split">
      {/* ── LEFT PANEL ─────────────────────── */}
      <div className="auth-left">
        <div className="auth-orb auth-o1" />
        <div className="auth-orb auth-o2" />
        <div className="auth-orb auth-o3" />
        <div className="auth-grid" />

        <div className="auth-left-inner">
          {/* Logo */}
          <div className="al-logo">
            <div className="al-logo-ic">V</div>
            <span>ValueShare</span>
          </div>

          {/* Carousel */}
          <div className="auth-slides">
            {SLIDES.map((s, i) => (
              <div key={i} className={`auth-slide${i === slide ? ' auth-slide-active' : ''}`}>
                <div className="asl-eyebrow">
                  <span className="asl-eyebrow-line" />
                  {s.eyebrow}
                </div>
                <div className="asl-headline">{s.headline}</div>
                <div className="asl-body">{s.body}</div>

                {s.stats && (
                  <div className="asl-stat-row">
                    {s.stats.map((st, j) => (
                      <div key={j} className="asl-stat">
                        <div className="val">{st.val}</div>
                        <div className="lbl">{st.lbl}</div>
                      </div>
                    ))}
                  </div>
                )}

                {s.testimonial && (
                  <div className="auth-testi">
                    <div className="at-stars">{s.testimonial.stars}</div>
                    <div className="at-q">{s.testimonial.quote}</div>
                    <div className="at-auth">
                      <div className="at-av" style={{ background: s.testimonial.color }}>
                        {s.testimonial.initials}
                      </div>
                      <div>
                        <div className="at-name">{s.testimonial.name}</div>
                        <div className="at-role">{s.testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Floating notification */}
          <div className="auth-float">
            <div className="auth-float-ico" style={{ background: 'rgba(5,150,105,.1)' }}>🔔</div>
            <div>
              <div className="auth-float-t">New referral converted!</div>
              <div className="auth-float-s">sarah_c just earned $24.00</div>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="al-bottom">
            <div className="al-dots">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  className={`al-dot${i === slide ? ' al-dot-active' : ''}`}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
            <div className="al-nav">
              <button
                className="al-nav-btn"
                onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)}
              >
                ←
              </button>
              <button
                className="al-nav-btn"
                onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────── */}
      <div className="auth-right">
        <div className="auth-fc">
          {/* Mode tabs */}
          <div className="auth-tabs">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`auth-tab${
                  pathname === tab.href ||
                  (tab.href === '/auth/login' && (pathname === '/auth/forgot-password' || pathname === '/auth/reset-password'))
                    ? ' auth-tab-active' : ''
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  )
}
