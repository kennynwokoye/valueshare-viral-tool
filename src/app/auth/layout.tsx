'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const SLIDES = [
  {
    eyebrow: 'REWARD-POWERED GROWTH',
    headline: (
      <>Turn your digital assets into a <span className="em">measurable growth engine</span></>
    ),
    body: 'Set a goal, offer a reward, and let participants spread your campaign. ValueShare tracks every result and delivers rewards automatically.',
    stats: [
      { val: '<5 min', lbl: 'Campaign setup' },
      { val: 'Real-time', lbl: 'Fraud detection' },
      { val: 'Auto', lbl: 'Reward delivery' },
    ],
  },
  {
    eyebrow: 'CREATOR GROWTH',
    headline: (
      <>Your existing value is <span className="em">untapped fuel</span> for growth</>
    ),
    body: 'Offer your mini-course, template, or blueprint as a reward. Participants share your campaign and unlock it when they hit milestones — growth on autopilot.',
    testimonial: {
      stars: '★★★★★',
      quote: '"I launched a webinar campaign and hit 500 registrations in 72 hours. The referral mechanic did all the heavy lifting."',
      name: 'Kenny Nwokoye',
      role: 'Marketing Educator · 40K following',
      color: '#e85d3a',
      initials: 'KN',
    },
  },
  {
    eyebrow: 'BUILT FOR RESULTS',
    headline: (
      <>Designed for <span className="em">real growth</span>, not vanity metrics</>
    ),
    body: 'Track clicks, leads, and registrations tied to real business goals. Fraud controls, live analytics, and automatic fulfillment — no manual work required.',
    stats: [
      { val: 'Verified', lbl: 'Clicks only' },
      { val: 'Live', lbl: 'Analytics' },
      { val: '4 types', lbl: 'Reward delivery' },
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
            <div className="auth-float-ico" style={{ background: 'rgba(5,150,105,.1)' }}>🎯</div>
            <div>
              <div className="auth-float-t">New milestone reached!</div>
              <div className="auth-float-s">Adaeze just hit 50 clicks</div>
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
