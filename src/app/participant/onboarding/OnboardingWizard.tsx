'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatReferralUrl, generateShareCaptions } from '@/lib/utils'
import { buildShareUrl } from '@/lib/share'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, RewardTier, CampaignPromoAsset } from '@/types'

interface Props {
  referralCode: string
  email: string
  campaign: Campaign
  firstTier: RewardTier | null
  promoAssets: CampaignPromoAsset[]
}

const TEMPLATE_GRADIENT: Record<string, string> = {
  webinar_referral: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
  ebook_giveaway:   'linear-gradient(135deg,#d97706,#f59e0b)',
  video_content:    'linear-gradient(135deg,#e11d48,#f43f5e)',
  whatsapp_share:   'linear-gradient(135deg,#059669,#10b981)',
  product_launch:   'linear-gradient(135deg,#7c3aed,#8b5cf6)',
}

const STEP_LABELS = ['Welcome', 'Your link', 'Materials', 'Share']

export default function OnboardingWizard({ referralCode, email, campaign, firstTier, promoAssets }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [copied, setCopied] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const referralLink = formatReferralUrl(referralCode)
  const gradient = TEMPLATE_GRADIENT[campaign.template ?? ''] ?? 'linear-gradient(135deg,#e85d3a,#f97316)'

  const captions = firstTier
    ? generateShareCaptions({
        referralLink,
        campaignHeadline: campaign.headline,
        rewardLabel: firstTier.reward_label,
        threshold: firstTier.threshold,
        kpiType: campaign.kpi_type,
      })
    : null

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCaptionCopy() {
    if (!captions) return
    navigator.clipboard.writeText(captions.whatsapp).catch(() => {})
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  function handleShare(platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'email') {
    if (!captions) return
    const text = platform !== 'email' ? (captions[platform] ?? captions.whatsapp) : captions.whatsapp
    window.open(buildShareUrl(platform, { url: referralLink, text, subject: campaign.headline }), '_blank')
  }

  function handleDownload(filePath: string, fileName: string) {
    const supabase = createClient()
    const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(filePath)
    const a = document.createElement('a')
    a.href = urlData.publicUrl
    a.download = fileName
    a.target = '_blank'
    a.click()
  }

  function handleDone() {
    router.push(`/dashboard/participant?campaign=${campaign.id}`)
  }

  return (
    <div className="ob-page">
      <div className="ob-card">
        {/* Logo */}
        <div className="ob-logo">
          <div className="ob-logo-ic">◆</div>
          Value<span>Share</span>
        </div>

        {/* Step indicator */}
        <div className="ob-stepper">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const isDone = n < step
            const isActive = n === step
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`ob-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                  <div className="ob-step-num">{isDone ? '✓' : n}</div>
                  <div className="ob-step-lbl">{label}</div>
                </div>
                {n < 4 && <div className="ob-step-line" />}
              </div>
            )
          })}
        </div>

        {/* ── Step 1: Welcome ──────────────────────────── */}
        {step === 1 && (
          <div className="ob-body">
            {campaign.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.hero_image_url} alt={campaign.name} className="ob-hero" />
            ) : (
              <div className="ob-hero" style={{ background: gradient }} />
            )}

            <div className="ob-welcome-h">
              👋 You just joined{' '}
              <span style={{ color: 'var(--vs-accent)' }}>{campaign.name}</span>!
            </div>
            <p style={{ fontSize: 15, color: 'var(--vs-text-2)', marginBottom: 24, lineHeight: 1.6 }}>
              {campaign.headline}
            </p>

            <div className="ob-how-list">
              <div className="ob-how-item">
                <div className="ob-how-num">1</div>
                <div>Share your unique ValueShare link with friends &amp; your audience</div>
              </div>
              <div className="ob-how-item">
                <div className="ob-how-num">2</div>
                <div>Every click through your link is tracked and verified automatically</div>
              </div>
              <div className="ob-how-item">
                <div className="ob-how-num">3</div>
                <div>
                  {firstTier
                    ? <>Unlock <strong>{firstTier.reward_label}</strong> when you reach <strong>{firstTier.threshold} clicks</strong> 🎁</>
                    : <>Earn rewards as you hit milestones 🎁</>}
                </div>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn" onClick={() => setStep(2)}>Get my link →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Copy your link ───────────────────── */}
        {step === 2 && (
          <div className="ob-body">
            <div className="ob-step-title">🔗 Your unique ValueShare link</div>
            <p className="ob-step-sub">
              Every click through this link is attributed only to you and counts toward your reward.
            </p>

            <div className="ref-box" style={{ margin: '0 0 20px' }}>
              <div className="ref-label">{campaign.name}</div>
              <div className="ref-link-row">
                <div className="ref-link">{referralLink}</div>
                <button className="ref-copy-btn" onClick={handleCopy}>
                  {copied ? '✓ Copied!' : '📋 Copy link'}
                </button>
              </div>
              <div className="ref-note">💡 Pro tip: Add your link to your bio, stories, and WhatsApp status for maximum reach.</div>
            </div>

            {firstTier && (
              <div className="ob-reward-pill">
                🏆 Earn <strong>{firstTier.reward_label}</strong> for <strong>{firstTier.threshold}</strong> clicks
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn" onClick={() => setStep(3)}>Next: Get materials →</button>
              <button className="ob-back" onClick={() => setStep(1)}>← Back</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Promotional materials ───────────── */}
        {step === 3 && (
          <div className="ob-body">
            <div className="ob-step-title">🖼️ Promotional materials</div>
            <p className="ob-step-sub">Use these to make sharing easier.</p>

            {/* Creator promo assets */}
            {promoAssets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--vs-text-2)', marginBottom: 4 }}>Creator materials</div>
                {promoAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleDownload(asset.file_path, asset.file_name)}
                    style={{ background: 'var(--vs-surface-2)', border: '1px solid var(--vs-border)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 24 }}>🖼️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--vs-text)' }}>{asset.file_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--vs-text-3)', marginTop: 2 }}>{asset.file_type} · Ready to share</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vs-success)' }}>⬇ Download</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--vs-text-3)', marginBottom: 24, padding: '12px 0' }}>
                No extra materials yet — your ValueShare link is all you need!
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn" onClick={() => setStep(4)}>Next: Start sharing →</button>
              <button className="ob-back" onClick={() => setStep(2)}>← Back</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Start sharing ────────────────────── */}
        {step === 4 && (
          <div className="ob-body">
            <div className="ob-step-title">🚀 Time to share!</div>
            <p className="ob-step-sub">Pick a platform and send your first share now.</p>

            <div className="share-grid" style={{ marginBottom: 20 }}>
              <button className="share-btn sb-wa" onClick={() => handleShare('whatsapp')}><span className="sb-ico">💬</span>WhatsApp</button>
              <button className="share-btn sb-fb" onClick={() => handleShare('facebook')}><span className="sb-ico">📘</span>Facebook</button>
              <button className="share-btn sb-tw" onClick={() => handleShare('twitter')}><span className="sb-ico">🐦</span>Twitter/X</button>
              <button className="share-btn sb-ig" onClick={() => window.open(referralLink, '_blank')}><span className="sb-ico">📸</span>Instagram</button>
              <button className="share-btn" style={{ background: '#0a66c2', color: '#fff' }} onClick={() => handleShare('linkedin')}><span className="sb-ico">🔗</span>LinkedIn</button>
              <button className="share-btn sb-em" onClick={() => handleShare('email')}><span className="sb-ico">✉️</span>Email</button>
            </div>

            {captions && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--vs-text-2)', marginBottom: 8 }}>Suggested caption</div>
                <div style={{ background: 'var(--vs-surface-2)', border: '1.5px solid var(--vs-border)', borderRadius: 9, padding: 14, fontSize: 13, color: 'var(--vs-text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {captions.whatsapp}
                </div>
                <button className="ref-copy-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={handleCaptionCopy}>
                  {captionCopied ? '✓ Caption copied!' : '📋 Copy caption'}
                </button>
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn" onClick={handleDone}>🚀 Go to my dashboard →</button>
              <button className="ob-skip" onClick={handleDone}>Skip for now</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--vs-text-3)' }}>
        Logged in as <strong>{email}</strong>
      </div>
    </div>
  )
}
