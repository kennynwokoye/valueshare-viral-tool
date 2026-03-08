import type { SupabaseClient } from '@supabase/supabase-js'
import type { FraudCheckResult } from '@/types'

// Known bot / automation patterns
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /facebookexternalhit/i, /Twitterbot/i, /LinkedInBot/i,
  /WhatsApp/i, /Googlebot/i, /bingbot/i, /YandexBot/i,
  /Baiduspider/i, /DuckDuckBot/i, /Sogou/i,
  /curl/i, /wget/i, /python-requests/i, /axios/i, /node-fetch/i,
  /HeadlessChrome/i, /PhantomJS/i, /Selenium/i,
]

/**
 * Run fraud detection on a referral click.
 *
 * Rules (additive scoring):
 *   +80  Bot user-agent or missing UA
 *   +50  Same IP + same participant within 24 h
 *   +30  Same IP > 10 clicks (any link) in 1 h
 *
 * Threshold: score >= 50 → is_valid = false
 */
export async function detectFraud({
  supabase,
  participantId,
  ip,
  userAgent,
}: {
  supabase: SupabaseClient
  participantId: string
  campaignId: string
  ip: string
  userAgent: string | null
}): Promise<FraudCheckResult> {
  let score = 0
  const reasons: string[] = []

  // ── Rule 1: Bot detection (no DB query) ──────────────
  if (!userAgent || userAgent.trim() === '') {
    score += 80
    reasons.push('missing_user_agent')
  } else if (BOT_PATTERNS.some((p) => p.test(userAgent))) {
    score += 80
    reasons.push('bot_user_agent')
  }

  // ── Rules 2 & 3: DB-based checks (run in parallel) ──
  const now = Date.now()
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()

  const [dupResult, velocityResult] = await Promise.all([
    // Rule 2: Duplicate IP for this participant in last 24 h
    supabase
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', participantId)
      .eq('ip_address', ip)
      .gte('created_at', twentyFourHoursAgo),

    // Rule 3: IP velocity across all participants in last 1 h
    supabase
      .from('referral_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo),
  ])

  if ((dupResult.count ?? 0) > 0) {
    score += 50
    reasons.push('duplicate_ip_participant_24h')
  }

  if ((velocityResult.count ?? 0) > 10) {
    score += 30
    reasons.push('ip_velocity_exceeded')
  }

  return {
    score,
    is_valid: score < 50,
    reasons,
  }
}
