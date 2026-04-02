import Link from 'next/link'
import MobileNav from '@/components/MobileNav'
import NavAuth from '@/components/NavAuth'

export default function Home() {
  return (
    <>
      {/* ── NAV ─────────────────────────────────── */}
      <nav className="hp-nav">
        <Link href="/" className="hp-logo">
          <div className="hp-logo-ic">◆</div>
          ValueShare
        </Link>
        <div className="nav-c">
          <Link href="/marketplace">Marketplace</Link>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link href="/pricing">Pricing</Link>
        </div>
        <MobileNav />
        <NavAuth />
      </nav>

      {/* ── HERO ────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="h-flag">
              <div className="flag-dot">◆</div>
              Reward-powered growth platform
            </div>
            <h1 className="hp-h1">
              Turn your best digital assets<br />into a{' '}
              <span className="accent">growth engine</span>
            </h1>
            <p className="h-p">
              ValueShare helps creators, marketers, and solopreneurs grow traffic,
              leads, and registrations by rewarding people for driving real results —
              not just sharing links.
            </p>
            <div className="h-actions">
              <Link href="/auth/signup" className="btn-coral">Start for free →</Link>
              <Link href="/marketplace" className="btn-line">Browse campaigns →</Link>
            </div>
            <div className="h-meta">
              <div className="h-av-group">
                <div className="h-av" style={{ background: '#e85d3a' }}>K</div>
                <div className="h-av" style={{ background: '#059669' }}>A</div>
                <div className="h-av" style={{ background: '#7c3aed' }}>T</div>
                <div className="h-av" style={{ background: '#0284c7' }}>F</div>
              </div>
              <p className="h-meta-txt"><strong>2,400+ creators</strong> growing virally</p>
              <div className="h-divider" />
              <div className="h-rating">
                <div className="h-stars">★★★★★</div>
                <div className="h-rate-txt">Rated 4.9 by creators</div>
              </div>
            </div>
          </div>

          {/* Visual card */}
          <div className="h-vis">
            <div className="fl fl1">
              <div className="fl-ico" style={{ background: 'var(--coral-light)' }}>🏆</div>
              <div>
                <div className="fl-t">Reward unlocked!</div>
                <div className="fl-s">Adaeze hit 50 clicks</div>
              </div>
            </div>

            <div className="v-card">
              <div className="vc-top">
                <div className="vc-dots">
                  <div className="vcd" style={{ background: '#ff5f57' }} />
                  <div className="vcd" style={{ background: '#febc2e' }} />
                  <div className="vcd" style={{ background: '#28c840' }} />
                </div>
                <div className="vc-tag">● Live</div>
              </div>
              <div className="vc-body">
                <div className="vc-campaign">
                  <div>
                    <div className="vcc-name">Webinar ValueShare Campaign</div>
                    <div className="vcc-sub">50 clicks → Masterclass</div>
                  </div>
                  <div className="vcc-badge">Active</div>
                </div>
                <div className="vc-stats">
                  <div className="vs-box"><div className="vs-n">847</div><div className="vs-l">Clicks</div></div>
                  <div className="vs-box"><div className="vs-n">312</div><div className="vs-l">Joined</div></div>
                  <div className="vs-box"><div className="vs-n">2.7×</div><div className="vs-l">Viral</div></div>
                </div>
                <div className="vc-prog">
                  <div className="vp-hd">
                    <span className="vp-lt">Goal progress</span>
                    <span className="vp-rt">68%</span>
                  </div>
                  <div className="vp-bar"><div className="vp-fill" /></div>
                </div>
                <div className="vc-list">
                  <div className="vl-row">
                    <div className="vl-l"><div className="vl-av" style={{ background: '#e85d3a' }}>A</div><div className="vl-n">Adaeze O.</div></div>
                    <div className="vl-c">72 clicks</div>
                  </div>
                  <div className="vl-row">
                    <div className="vl-l"><div className="vl-av" style={{ background: '#059669' }}>T</div><div className="vl-n">Tunde B.</div></div>
                    <div className="vl-c">58 clicks</div>
                  </div>
                  <div className="vl-row">
                    <div className="vl-l"><div className="vl-av" style={{ background: '#7c3aed' }}>F</div><div className="vl-n">Fatima K.</div></div>
                    <div className="vl-c">41 clicks</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="fl fl2">
              <div className="fl-ico" style={{ background: 'var(--emerald-bg)' }}>📈</div>
              <div>
                <div className="fl-t">+28 joined today</div>
                <div className="fl-s">Viral coefficient 2.7×</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS ────────────────────────────────── */}
      <div className="logos-row">
        <div className="logos-inner">
          <span className="lg-lbl">Works with your existing tools</span>
          <div className="lg-list">
            <span className="lg-item">Kajabi</span>
            <span className="lg-item">ClickFunnels</span>
            <span className="lg-item">GoHighLevel</span>
            <span className="lg-item">WordPress</span>
            <span className="lg-item">Thrivecart</span>
            <span className="lg-item">Any URL</span>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <div className="sec" id="how">
        <div className="eyebrow"><div className="eyebrow-line" />How it works</div>
        <h2 className="hp-h2">
          Launch a reward-powered growth<br />campaign{' '}
          <span className="serif">in minutes</span>
        </h2>
        <p className="sub">No code. No agency. No complex setup. Just a campaign that markets itself.</p>
        <div className="how how-4">
          <div className="hw-c" data-n="01">
            <div className="hw-ico">🎯</div>
            <div className="hw-t">Choose the result you want</div>
            <p className="hw-d">
              Set the exact action you want people to help you drive — clicks, leads,
              webinar registrations, email subscribers, or waitlist signups.
            </p>
          </div>
          <div className="hw-c" data-n="02">
            <div className="hw-ico">🎁</div>
            <div className="hw-t">Attach a reward people actually want</div>
            <p className="hw-d">
              Offer a blueprint, mini-course, template, bonus, or resource pack your
              audience wants badly enough to share for.
            </p>
          </div>
          <div className="hw-c" data-n="03">
            <div className="hw-ico">🔗</div>
            <div className="hw-t">Let participants spread the campaign</div>
            <p className="hw-d">
              Each participant gets a unique ValueShare link. As they share, ValueShare
              tracks the results and attributes every qualifying action to the right person.
            </p>
          </div>
          <div className="hw-c" data-n="04">
            <div className="hw-ico">⚡</div>
            <div className="hw-t">Reward performance automatically</div>
            <p className="hw-d">
              When milestones are reached, ValueShare verifies the result and delivers
              the reward instantly. No spreadsheets. No manual tracking. No chasing people down.
            </p>
          </div>
        </div>
      </div>

      {/* ── USE CASES ────────────────────────────── */}
      <div className="sec" id="use-cases" style={{ paddingTop: 0 }}>
        <div className="eyebrow"><div className="eyebrow-line" />Use cases</div>
        <h2 className="hp-h2">
          Built for the kinds of growth campaigns<br />
          <span className="serif">internet businesses actually run</span>
        </h2>
        <div className="uc-grid">
          <div className="uc-c">
            <div className="uc-ico">🎓</div>
            <div className="uc-t">Offer a mini-course in exchange for webinar signups</div>
          </div>
          <div className="uc-c">
            <div className="uc-ico">📧</div>
            <div className="uc-t">Use a lead magnet to multiply email list growth</div>
          </div>
          <div className="uc-c">
            <div className="uc-ico">🚀</div>
            <div className="uc-t">Drive waitlist signups for an upcoming SaaS or product launch</div>
          </div>
          <div className="uc-c">
            <div className="uc-ico">💬</div>
            <div className="uc-t">Reward shares that bring people into your WhatsApp or community funnel</div>
          </div>
          <div className="uc-c">
            <div className="uc-ico">📄</div>
            <div className="uc-t">Turn templates, blueprints, or bonuses into traffic-generating campaign assets</div>
          </div>
          <div className="uc-c">
            <div className="uc-ico">🎯</div>
            <div className="uc-t">Run launch campaigns that reward measurable outcomes, not empty shares</div>
          </div>
        </div>
      </div>

      {/* ── WHY VALUESHARE EXISTS ─────────────────── */}
      <div className="why-sec">
        <div className="why-inner">
          <div className="eyebrow eyebrow-light"><div className="eyebrow-line-light" />Why ValueShare exists</div>
          <h2 className="hp-h2" style={{ color: '#fff' }}>
            Most businesses already have value.<br />
            <span className="serif" style={{ color: 'var(--coral)' }}>They just aren&apos;t using it as a growth asset.</span>
          </h2>
          <p className="why-body">
            Creators and marketers are sitting on underused digital assets — courses, checklists, swipe files,
            training videos, templates, and bonuses. ValueShare helps you package that value into a clear incentive
            so your audience, supporters, and customers can help you grow.
          </p>
          <div className="why-ps">
            <div className="why-p">
              <div className="why-p-label">More than sharing software</div>
              <p className="why-p-txt">
                ValueShare is built for businesses that want outcome-driven growth. Instead of relying only on ads,
                generic affiliate systems, or manual tracking, you can launch reward-powered campaigns that
                motivate people to help you grow — and reward them automatically when they deliver results.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────── */}
      <div className="testi-sec" id="testimonials">
        <div className="ti">
          <div className="eyebrow"><div className="eyebrow-line" />Creator stories</div>
          <h2 className="hp-h2">Results that <span className="serif">speak for themselves</span></h2>
          <div className="ti-grid">
            <div className="ti-c">
              <div className="ti-q">&ldquo;</div>
              <p className="ti-txt">
                I launched a webinar campaign and hit 500 registrations in 72 hours.
                The ValueShare mechanic did all the heavy lifting — participants recruited
                each other without me lifting a finger.
              </p>
              <div className="ti-auth">
                <div className="ti-av" style={{ background: '#e85d3a' }}>K</div>
                <div>
                  <div className="ti-nm">Kenny Nwokoye</div>
                  <div className="ti-rl">Marketing Educator · 40K following</div>
                </div>
              </div>
            </div>
            <div className="ti-c">
              <div className="ti-q">&ldquo;</div>
              <p className="ti-txt">
                Set up my ebook campaign in 20 minutes. Went from 80 leads to 1,400
                in a single week. The fraud detection gives me real confidence that
                every click is legitimate.
              </p>
              <div className="ti-auth">
                <div className="ti-av" style={{ background: '#059669' }}>A</div>
                <div>
                  <div className="ti-nm">Amara Singh</div>
                  <div className="ti-rl">Course Creator · 12K students</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────── */}
      <div className="sec" id="features" style={{ paddingTop: 80 }}>
        <div className="eyebrow"><div className="eyebrow-line" />Features</div>
        <h2 className="hp-h2">Built to run <span className="em serif">on autopilot</span></h2>
        <p className="sub">
          Every tool you need to set campaigns live, track every click, and
          deliver rewards automatically.
        </p>
        <div className="feat-strip">
          <div className="fs-c"><div className="fs-ico">🔗</div><div className="fs-t">Unique ValueShare links</div><p className="fs-d">Every participant gets a personal link. Every click attributed to the right person.</p></div>
          <div className="fs-c"><div className="fs-ico">🛡️</div><div className="fs-t">Fraud prevention</div><p className="fs-d">IP tracking, device fingerprinting, velocity limits. Only real clicks count.</p></div>
          <div className="fs-c"><div className="fs-ico">🎁</div><div className="fs-t">Auto reward delivery</div><p className="fs-d">Files, videos, booking links — delivered the instant a milestone is hit.</p></div>
          <div className="fs-c"><div className="fs-ico">📊</div><div className="fs-t">Live analytics</div><p className="fs-d">Viral coefficient, top performers, click sources. Everything in real time.</p></div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────── */}
      <div className="cta-wrap" id="cta">
        <div className="cta-inner">
          <div className="cta-l">
            <h2 className="hp-h2">
              If you already have value,<br />
              you already have <span className="serif-em" style={{ color: 'var(--coral)' }}>fuel for growth</span>
            </h2>
            <p>Launch a ValueShare campaign and turn your audience, supporters, and customers into a measurable distribution channel.</p>
          </div>
          <div className="cta-r">
            <Link href="/auth/signup" className="btn-wh2">Create your first campaign →</Link>
            <a href="#how" className="btn-coral2">See how it works</a>
            <div className="cta-note">Free to start · No credit card required</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────── */}
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
