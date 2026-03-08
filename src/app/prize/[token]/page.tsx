import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import ExpiryCountdown from './ExpiryCountdown'

interface Props {
  params: Promise<{ token: string }>
}

interface TokenResult {
  valid: boolean
  reason?: string
  reward_type?: 'file' | 'video_url' | 'call_booking' | 'external_url'
  reward_url?: string | null
  reward_file_path?: string | null
  reward_file_name?: string | null
  reward_label?: string
  participant_email?: string
  expires_at?: string
}

const REWARD_CONFIG: Record<
  string,
  { icon: string; cta: string }
> = {
  file: { icon: '\uD83D\uDCC4', cta: 'Download File' },
  video_url: { icon: '\uD83C\uDFAC', cta: 'Watch Video' },
  call_booking: { icon: '\uD83D\uDCDE', cta: 'Book Your Call' },
  external_url: { icon: '\uD83D\uDD17', cta: 'Access Reward' },
}

/* ── Metadata ────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.rpc('validate_reward_token', {
    p_token: token,
  })
  const result = data as TokenResult | null

  if (!result?.valid) {
    return { title: 'Reward Not Found | ValueShare' }
  }

  return {
    title: `${result.reward_label} | ValueShare`,
    description: `Claim your reward: ${result.reward_label}`,
  }
}

/* ── Page ────────────────────────────────────────────── */

export default async function PrizePage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('validate_reward_token', {
    p_token: token,
  })

  const result = data as TokenResult | null

  /* ── Token not found ─────────────────────────────── */
  if (error || !result || (!result.valid && result.reason === 'Token not found')) {
    return (
      <div className="pz-page">
        <div className="pz-container">
          <div className="pz-error">
            <div className="pz-error-icon">&#x1F512;</div>
            <h1 className="pz-error-title">Reward Not Found</h1>
            <p className="pz-error-text">
              This reward link is invalid or has been removed.
            </p>
          </div>
          <footer className="pz-footer">
            <strong>ValueShare</strong> &mdash; Viral referral campaigns made
            simple
          </footer>
        </div>
      </div>
    )
  }

  /* ── Token expired ───────────────────────────────── */
  if (!result.valid && result.reason === 'Token expired') {
    return (
      <div className="pz-page">
        <div className="pz-container">
          <div className="pz-error">
            <div className="pz-error-icon">&#x23F0;</div>
            <h1 className="pz-error-title">Access Expired</h1>
            <p className="pz-error-text">
              This reward link has expired. Contact the campaign creator if you
              need a new link.
            </p>
          </div>
          <footer className="pz-footer">
            <strong>ValueShare</strong> &mdash; Viral referral campaigns made
            simple
          </footer>
        </div>
      </div>
    )
  }

  /* ── Valid token — show reward ────────────────────── */
  const { reward_type, reward_url, reward_label, expires_at } = result
  const config = REWARD_CONFIG[reward_type || 'external_url']

  return (
    <div className="pz-page">
      <div className="pz-container">
        {/* Header */}
        <header className="pz-header">
          <h2 className="pz-header-title">Your Reward</h2>
          <div className="pz-powered">
            Powered by <strong>ValueShare</strong>
          </div>
        </header>

        {/* Reward card */}
        <div className="pz-card">
          <div className="pz-icon">{config.icon}</div>
          <h1 className="pz-title">{reward_label}</h1>

          {/* Expiry countdown */}
          {expires_at && <ExpiryCountdown expiresAt={expires_at} />}

          {/* CTA — type-specific */}
          {reward_type === 'call_booking' && !reward_url ? (
            <div className="pz-message">
              The creator will contact you to arrange your call. Keep an eye on
              your inbox.
            </div>
          ) : reward_url ? (
            <a
              href={reward_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pz-btn"
            >
              {config.cta} &rarr;
            </a>
          ) : (
            <div className="pz-message">
              The creator will deliver your reward shortly. Check your email.
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pz-footer">
          <strong>ValueShare</strong> &mdash; Viral referral campaigns made
          simple
        </footer>
      </div>
    </div>
  )
}
