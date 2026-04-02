import type {
  KpiType,
  HowItWorksStep,
  CampaignTemplate,
  CampaignTemplateRef,
  CreateCampaignPayload,
  LandingTemplate,
  LandingConfig,
  LandingTemplateDefinition,
} from '@/types'

// ── 1. buildHowItWorksSteps ──────────────────────────────

const HOW_IT_WORKS: Record<KpiType, [string, string][]> = {
  clicks: [
    ['Get Your Link', 'Sign up and receive your unique referral link instantly'],
    ['Share Everywhere', 'Post your link on social media, messaging apps, or email'],
    ['Unlock Your Reward', 'When enough people click your link, your reward unlocks automatically'],
  ],
  registrations: [
    ['Get Your Link', 'Sign up and receive your unique referral link instantly'],
    ['Invite Friends to Register', 'Share your link with people who would benefit from signing up'],
    ['Unlock Your Reward', 'Each friend who registers moves you closer to your reward'],
  ],
  purchases: [
    ['Get Your Link', 'Sign up and receive your unique referral link instantly'],
    ['Share With Buyers', 'Send your link to people who would love this product'],
    ['Earn Your Reward', 'When your referrals make a purchase, you earn your reward'],
  ],
  shares: [
    ['Get Your Link', 'Sign up and receive your unique referral link instantly'],
    ['Get Others to Share', 'Encourage your network to reshare and spread the word'],
    ['Claim Your Prize', 'Hit the sharing target and claim your prize instantly'],
  ],
}

export function buildHowItWorksSteps(kpiType: KpiType): HowItWorksStep[] {
  const steps = HOW_IT_WORKS[kpiType] ?? HOW_IT_WORKS.clicks
  return steps.map(([title, description], i) => ({
    step: i + 1,
    title,
    description,
  }))
}

// ── 2. getTemplateDefaults ───────────────────────────────

export function getTemplateDefaults(
  template: CampaignTemplate,
  templates: CampaignTemplateRef[]
): Partial<CreateCampaignPayload> {
  const ref = templates.find((t) => t.template_key === template)
  if (!ref) return {}

  const deadlineDays = ref.suggested_deadline_days ?? 7
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + deadlineDays)

  return {
    template,
    headline: ref.default_headline,
    subheadline: ref.default_subheadline ?? undefined,
    description: ref.default_description ?? undefined,
    benefits: ref.default_benefits,
    how_it_works: ref.default_how_it_works,
    kpi_type: ref.default_kpi_type,
    deadline: deadline.toISOString(),
    reward_tiers: [
      {
        tier_order: 1,
        label: 'Main Reward',
        threshold: ref.default_threshold,
        reward_type: 'external_url',
        reward_label: ref.default_reward_label ?? 'Reward',
        access_duration_hours: 72,
      },
    ],
  }
}

// ── 3. validateCampaignStep ──────────────────────────────

export function validateCampaignStep(
  step: number,
  data: Partial<CreateCampaignPayload>
): Record<string, string> {
  const errors: Record<string, string> = {}

  // Step 1: Campaign Goal
  if (step === 1) {
    if (!data.kpi_type) errors.kpi_type = 'Choose a campaign goal'
  }

  // Step 2: Landing Template
  if (step === 2) {
    if (!data.landing_template) errors.landing_template = 'Choose a template'
  }

  // Step 3: Campaign Basics
  if (step === 3) {
    if (!data.name?.trim()) errors.name = 'Campaign name is required'
    if (!data.headline?.trim()) errors.headline = 'Headline is required'
    if (data.headline && data.headline.length > 100) {
      errors.headline = 'Headline must be 100 characters or fewer'
    }
    if (!data.description?.trim()) errors.description = 'Description is required'
    if (!data.creator_display_name?.trim()) errors.creator_display_name = 'Creator name is required'
  }

  // Step 4: Reward Setup (merged old steps 2+3)
  if (step === 4) {
    if (!data.reward_tiers?.length) {
      errors.reward_tiers = 'At least one reward tier is required'
    } else {
      const tier = data.reward_tiers[0]
      if (!tier.reward_type) {
        errors.reward_type = 'Select a reward type'
      }
      if (!tier.reward_label?.trim()) {
        errors.reward_label = 'Reward title is required'
      }
      if (!tier.preview_teaser?.trim()) {
        errors.preview_teaser = 'Reward description is required'
      }
      if (!tier.threshold || tier.threshold <= 0) {
        errors.threshold = 'Clicks to unlock must be greater than 0'
      }
      if ((tier.reward_type === 'video_url' || tier.reward_type === 'call_booking') && !tier.reward_url?.trim()) {
        errors.reward_url = `${tier.reward_type === 'video_url' ? 'Video' : 'Booking'} URL is required`
      }
      if (tier.reward_url?.trim() && !isValidUrl(tier.reward_url)) {
        errors.reward_url = 'Must be a valid URL (https://...)'
      }
      // Multi-tier ascending order check
      for (let i = 1; i < data.reward_tiers.length; i++) {
        if (data.reward_tiers[i].threshold <= data.reward_tiers[i - 1].threshold) {
          errors.tier_order = 'Tier thresholds must be in ascending order'
          break
        }
      }
    }
  }

  // Step 5: Settings & Customize
  if (step === 5) {
    if (!data.destination_url?.trim()) {
      errors.destination_url = 'Destination URL is required'
    } else if (!isValidUrl(data.destination_url)) {
      errors.destination_url = 'Must be a valid URL starting with https://'
    }
    if (data.deadline) {
      const d = new Date(data.deadline)
      if (isNaN(d.getTime()) || d <= new Date()) {
        errors.deadline = 'Deadline must be a future date'
      }
    }
  }

  // Step 6 = preview — no validation needed

  return errors
}

// ── 4. SECTION ORDER ─────────────────────────────────────

export const DEFAULT_SECTION_ORDER = [
  'hero_image', 'video', 'subheadline', 'description', 'cta1',
  'benefits', 'cta2', 'how_it_works', 'faqs', 'creator_bio',
  'promo_pack', 'reward', 'tiers', 'countdown', 'join_form',
]

export const SECTION_LABELS: Record<string, string> = {
  hero_image: 'Hero Image',
  video: 'Video',
  subheadline: 'Sub-headline',
  description: 'Description',
  cta1: 'CTA Button 1',
  benefits: 'Benefits',
  cta2: 'CTA Button 2',
  how_it_works: 'How It Works',
  faqs: 'FAQs',
  creator_bio: 'Creator Bio',
  reward: 'Reward Preview',
  tiers: 'Tier Ladder',
  countdown: 'Countdown Timer',
  join_form: 'Join Form',
  promo_pack: 'Promo Pack',
}

export function getDefaultSectionOrder(formPosition: string): string[] {
  if (formPosition === 'top') {
    return ['join_form', ...DEFAULT_SECTION_ORDER.filter((k) => k !== 'join_form')]
  }
  return DEFAULT_SECTION_ORDER
}

// ── 5. LANDING_TEMPLATES ─────────────────────────────────

export const LANDING_TEMPLATES: LandingTemplateDefinition[] = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'The classic ValueShare look — warm, clean, and conversion-focused.',
    goalType: 'clicks',
    defaults: {
      accentColor: '#e85d3a',
      bgColor: '#f4f3f0',
      textColor: '#1c1917',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-starter',
  },
  {
    key: 'clean_light',
    name: 'Clean Light',
    description: 'Crisp white background with blue accents — professional and trustworthy.',
    goalType: 'registrations',
    defaults: {
      accentColor: '#3b82f6',
      bgColor: '#ffffff',
      textColor: '#1e293b',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-clean-light',
  },
  {
    key: 'bold_gradient',
    name: 'Bold Gradient',
    description: 'Dark mode with vibrant purple gradients — eye-catching and modern.',
    goalType: 'clicks',
    defaults: {
      accentColor: '#a855f7',
      bgColor: '#0f0a1a',
      textColor: '#f8f5ff',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-bold-gradient',
  },
  {
    key: 'warm_minimal',
    name: 'Warm Minimal',
    description: 'Earthy tones with serif headings — elegant and content-focused.',
    goalType: 'registrations',
    defaults: {
      accentColor: '#b45309',
      bgColor: '#f4f3f0',
      textColor: '#1c1917',
      headingFont: 'lora',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-warm-minimal',
  },
  {
    key: 'neon_night',
    name: 'Neon Night',
    description: 'Deep black with electric green glow — high-energy and tech-forward.',
    goalType: 'clicks',
    defaults: {
      accentColor: '#22c55e',
      bgColor: '#0a0a0f',
      textColor: '#e2e8f0',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-neon-night',
  },
  {
    key: 'sunrise',
    name: 'Sunrise',
    description: 'Warm cream with orange gradient hero — inviting with form up top.',
    goalType: 'registrations',
    defaults: {
      accentColor: '#ea580c',
      bgColor: '#fffbf5',
      textColor: '#1c1917',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'top',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-sunrise',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    description: 'Deep navy with cyan highlights — calm, cool, and immersive.',
    goalType: 'clicks',
    defaults: {
      accentColor: '#06b6d4',
      bgColor: '#0c1929',
      textColor: '#e0f2fe',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'bottom',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-ocean',
  },
  {
    key: 'conference',
    name: 'Conference',
    description: 'Clean split layout with form on the right — ideal for events.',
    goalType: 'registrations',
    defaults: {
      accentColor: '#6366f1',
      bgColor: '#f8fafc',
      textColor: '#0f172a',
      headingFont: 'cabinet',
      showBenefits: true,
      showHowItWorks: true,
      showCountdown: true,
      showSocialProof: true,
      ctaText: 'Get My Referral Link \u2192',
      formPosition: 'right',
      tagline: '',
      videoUrl: '',
      videoTitle: 'Watch This First',
      sectionOrder: [],
      faqs: [],
      creatorBio: '',
      cta2Text: '',
      benefitsTitle: '',
      howItWorksTitle: '',
      widgetHeadline: '',
      widgetSubheadline: '',
      widgetPrimaryColor: '',
      widgetDelay: 5,
      widgetPosition: 'inline',
      headlineFontSize: 'lg',
      heroImageMode: 'below',
      heroImageHeight: 'md',
      heroOverlayOpacity: 'medium',
      headlineFontSizeMobile: 'md',
      hiddenOnMobile: [],
    },
    layoutClass: 'cl-tpl-conference',
  },
]

export function getLandingTemplate(key: LandingTemplate): LandingTemplateDefinition {
  return LANDING_TEMPLATES.find(t => t.key === key) ?? LANDING_TEMPLATES[0]
}

export function getLandingTemplatesByGoal(goal: KpiType): LandingTemplateDefinition[] {
  return LANDING_TEMPLATES.filter(t => t.goalType === goal)
}

export function mergeLandingConfig(templateKey: LandingTemplate, overrides: LandingConfig = {}): Required<LandingConfig> {
  const tpl = getLandingTemplate(templateKey)
  return { ...tpl.defaults, ...overrides }
}

// ── 5. getVideoEmbedUrl ──────────────────────────────────

export function getVideoEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null
  // YouTube: watch?v=, youtu.be/, or /embed/ → extract 11-char video ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`
  // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`
  return null
}

// ── 6. isValidUrl ────────────────────────────────────────

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
