import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClickSource } from '@/types'

// ── 1. cn — className merging ──────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ── 2. formatNumber — K/M abbreviations ────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    const val = n / 1_000_000
    return `${parseFloat(val.toFixed(1))}M`
  }
  if (n >= 1_000) {
    const val = n / 1_000
    return `${parseFloat(val.toFixed(1))}K`
  }
  return String(n)
}

// ── 3. formatTimeRemaining — human-readable countdown ──

export function formatTimeRemaining(deadline: string): string {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  const diff = end - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`

  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} left`

  const minutes = Math.floor(diff / (1000 * 60))
  return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'} left`
}

// ── 4. getProgressPercentage — clamped 0-100 ───────────

export function getProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)))
}

// ── 5. generateShareCaptions — per-platform text ───────

interface ShareCaptionParams {
  referralLink: string
  campaignHeadline: string
  rewardLabel: string
  threshold: number
  kpiType: string
}

export function generateShareCaptions(
  params: ShareCaptionParams
): Record<'whatsapp' | 'facebook' | 'twitter' | 'linkedin', string> {
  const { referralLink, campaignHeadline, rewardLabel, threshold, kpiType } = params

  return {
    whatsapp:
      `🔥 Hey! Check this out 👇\n\n` +
      `${campaignHeadline}\n\n` +
      `I'm trying to unlock "${rewardLabel}" — I just need ${threshold} ${kpiType} to get it! 🎁\n\n` +
      `Help me out by clicking my link:\n${referralLink}\n\n` +
      `Takes 2 seconds, would mean the world! 🙏`,

    facebook:
      `I just found something awesome! ${campaignHeadline}\n\n` +
      `If ${threshold} of my friends click my link, I unlock "${rewardLabel}" for free.\n\n` +
      `Would love your help — just click here: ${referralLink}`,

    twitter:
      `${campaignHeadline}\n\n` +
      `Help me unlock "${rewardLabel}" — just click my link!\n\n` +
      `${referralLink}`,

    linkedin:
      `I'm participating in an exciting campaign: ${campaignHeadline}\n\n` +
      `By sharing this with my network and reaching ${threshold} ${kpiType}, ` +
      `I can unlock valuable content: "${rewardLabel}".\n\n` +
      `If you find this relevant, I'd appreciate your support: ${referralLink}`,
  }
}

// ── 6. detectClickSource — from referrer URL ───────────

export function detectClickSource(referrer: string | null): ClickSource {
  if (!referrer || referrer.trim() === '') return 'direct'

  const r = referrer.toLowerCase()

  if (r.includes('whatsapp') || r.includes('wa.me')) return 'whatsapp'
  if (r.includes('facebook.com') || r.includes('fb.com') || r.includes('m.facebook')) return 'facebook'
  if (r.includes('twitter.com') || r.includes('t.co') || r.includes('x.com')) return 'twitter'
  if (r.includes('linkedin.com')) return 'linkedin'
  if (r.includes('instagram.com') || r.includes('l.instagram')) return 'instagram'
  if (r.includes('mail') || r.includes('gmail') || r.includes('yahoo') || r.includes('outlook')) return 'email'

  return 'other'
}

// ── 7. slugify — URL-safe slug ─────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ── 8. formatCampaignUrl — public campaign URL ─────────

export function formatCampaignUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/campaign/${slug}`
}

// ── 9. formatReferralUrl — referral tracking URL ───────

export function formatReferralUrl(referralCode: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/r/${referralCode}`
}

// ── 10. truncateText — with ellipsis ───────────────────

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
