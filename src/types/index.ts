// ── ENUMS ──────────────────────────────────────────────
export type UserRole = 'creator' | 'participant' | 'admin'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'
export type KpiType = 'clicks' | 'registrations' | 'purchases' | 'shares'
export type RewardType = 'file' | 'video_url' | 'call_booking' | 'external_url'
export type NotificationType = 'reward_unlocked' | 'progress_milestone' | 'campaign_update' | 'welcome' | 'new_participant' | 'fraud_spike'
export type CampaignTemplate = 'webinar_referral' | 'ebook_giveaway' | 'video_content' | 'whatsapp_share' | 'product_launch'

// ── LANDING PAGE TEMPLATES ────────────────────────────
export type LandingTemplate = 'starter' | 'clean_light' | 'bold_gradient' | 'warm_minimal' | 'neon_night' | 'sunrise' | 'ocean' | 'conference'

export interface LandingConfig {
  accentColor?: string
  bgColor?: string
  textColor?: string
  headingFont?: 'cabinet' | 'lora'
  showBenefits?: boolean
  showHowItWorks?: boolean
  showCountdown?: boolean
  showSocialProof?: boolean
  ctaText?: string
  cta2Text?: string     // CTA2 button text (defaults to ctaText)
  formPosition?: 'bottom' | 'top' | 'right'
  tagline?: string      // Small badge above headline, e.g. "🔥 Limited Time Offer" (empty = hidden)
  videoUrl?: string     // YouTube or Vimeo URL (empty = no video section)
  videoTitle?: string   // Heading above video embed
  sectionOrder?: string[]  // Ordered array of section keys; undefined = default order
  faqs?: { question: string; answer: string }[]  // FAQ entries (max 8)
  creatorBio?: string   // Bio text for Creator Bio section
}

export interface LandingTemplateDefinition {
  key: LandingTemplate
  name: string
  description: string
  goalType: KpiType
  defaults: Required<LandingConfig>
  layoutClass: string
}
export type ClickSource = 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'direct' | 'email' | 'other'

// ── DATABASE TABLES ────────────────────────────────────
export interface User {
  id: string
  email: string
  role: UserRole
  country: string | null
  ip_address: string | null
  created_at: string
  updated_at: string
}

export interface CreatorProfile {
  id: string
  user_id: string
  name: string
  photo_url: string | null
  bio: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  creator_id: string
  name: string
  slug: string
  template: CampaignTemplate | null
  headline: string
  subheadline: string | null
  description: string | null
  hero_image_url: string | null
  hero_video_url: string | null
  benefits: string[]
  how_it_works: HowItWorksStep[]
  creator_display_name: string | null
  creator_photo_url: string | null
  destination_url: string
  thankyou_page_url: string | null
  kpi_type: KpiType
  deadline: string | null
  show_countdown: boolean
  participant_cap: number | null
  social_proof_visible: boolean
  status: CampaignStatus
  total_participants: number
  total_clicks: number
  marketplace_listed: boolean
  landing_template: LandingTemplate
  landing_config: LandingConfig
  created_at: string
  updated_at: string
}

export interface RewardTier {
  id: string
  campaign_id: string
  tier_order: number
  label: string
  threshold: number
  reward_type: RewardType
  reward_label: string
  reward_url: string | null
  reward_file_path: string | null
  reward_file_name: string | null
  preview_teaser: string | null
  access_duration_hours: number
  created_at: string
}

export interface CampaignPromoAsset {
  id: string
  campaign_id: string
  file_path: string
  file_name: string
  file_type: string
  caption: string | null
  created_at: string
}

export interface Participant {
  id: string
  user_id: string
  campaign_id: string
  referral_code: string
  email: string
  otp_code: string | null
  otp_expires_at: string | null
  click_count: number
  joined_at: string
  last_active_at: string
}

export interface ReferralClick {
  id: string
  participant_id: string
  campaign_id: string
  ip_address: string
  user_agent: string | null
  referrer: string | null
  country: string | null
  fraud_score: number
  is_valid: boolean
  fraud_reasons: string[]
  click_source: ClickSource | null
  created_at: string
}

export interface RewardUnlock {
  id: string
  participant_id: string
  tier_id: string
  campaign_id: string
  unlocked_at: string
  access_token: string
  token_expires_at: string
  token_used_count: number
  delivered_at: string | null
  delivery_email_sent: boolean
}

export interface Notification {
  id: string
  user_id: string
  participant_id: string | null
  campaign_id: string | null
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface EmbedWidget {
  id: string
  campaign_id: string
  widget_key: string
  widget_headline: string | null
  widget_subtext: string | null
  widget_cta: string
  widget_theme: 'light' | 'dark'
  widget_accent_color: string
  widget_success_headline: string | null
  widget_success_message: string | null
  widget_views: number
  widget_clicks: number
  created_at: string
  updated_at: string | null
}

// ── COMPOSITE TYPES ────────────────────────────────────
export interface HowItWorksStep {
  step: number
  title: string
  description: string
}

export interface CampaignWithTiers extends Campaign {
  reward_tiers: RewardTier[]
  creator_profile?: CreatorProfile
  promo_assets?: CampaignPromoAsset[]
  embed_widgets?: EmbedWidget | null
}

export interface ParticipantWithProgress extends Participant {
  campaign: Campaign
  unlocked_tiers: RewardUnlock[]
  next_tier: RewardTier | null
  progress_percentage: number
}

export interface CampaignAnalytics {
  total_participants: number
  total_clicks: number
  conversion_rate: number
  viral_coefficient: number
  time_remaining_hours: number | null
  top_participants: TopParticipant[]
  click_sources: Record<string, number>
  clicks_per_day: DailyClickData[]
}

export interface TopParticipant {
  email: string
  click_count: number
  joined_at: string
}

export interface DailyClickData {
  date: string
  clicks: number
}

// ── API PAYLOADS ───────────────────────────────────────
export interface CreateCampaignPayload {
  name: string
  template?: CampaignTemplate
  headline: string
  subheadline?: string
  description?: string
  hero_image_url?: string
  hero_video_url?: string
  benefits: string[]
  how_it_works: HowItWorksStep[]
  creator_display_name?: string
  creator_photo_url?: string
  destination_url: string
  thankyou_page_url?: string
  kpi_type: KpiType
  deadline?: string
  show_countdown: boolean
  participant_cap?: number
  social_proof_visible: boolean
  reward_tiers: CreateRewardTierPayload[]
  landing_template?: LandingTemplate
  landing_config?: LandingConfig
}

export interface CreateRewardTierPayload {
  tier_order: number
  label: string
  threshold: number
  reward_type: RewardType
  reward_label: string
  reward_url?: string
  preview_teaser?: string
  access_duration_hours: number
}

export interface UpdateCampaignPayload extends Partial<CreateCampaignPayload> {
  marketplace_listed?: boolean
}

export interface MarketplaceCampaign {
  id: string
  name: string
  slug: string
  headline: string
  hero_image_url: string | null
  template: CampaignTemplate | null
  total_participants: number
  participant_cap: number | null
  deadline: string | null
  created_at: string
  creator_name: string | null
  creator_photo: string | null
  first_tier: {
    label: string
    threshold: number
    reward_label: string
    reward_type: RewardType
  } | null
}

export interface CampaignTemplateRef {
  id: string
  template_key: CampaignTemplate
  name: string
  description: string
  icon: string
  default_headline: string
  default_subheadline: string | null
  default_description: string | null
  default_benefits: string[]
  default_how_it_works: HowItWorksStep[]
  default_kpi_type: KpiType
  default_threshold: number
  default_reward_label: string | null
  suggested_deadline_days: number
  created_at: string
}

export interface CampaignFull extends Campaign {
  reward_tiers: RewardTier[]
  campaign_promo_assets: CampaignPromoAsset[]
  embed_widgets: EmbedWidget | null
}

export interface ShareCaption {
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin'
  text: string
  url: string
}

export interface FraudCheckResult {
  score: number
  is_valid: boolean
  reasons: string[]
}

// ── PARTICIPANT DASHBOARD ─────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  participant_id: string
  display_name: string
  initial: string
  click_count: number
  is_me: boolean
  joined_at: string
}

export interface ParticipantDashboardData {
  participant: Participant
  campaign: Campaign
  rewardTiers: RewardTier[]
  unlockedRewards: (RewardUnlock & { tier: RewardTier })[]
  promoAssets: CampaignPromoAsset[]
  recentClicks: ReferralClick[]
  leaderboard: LeaderboardEntry[]
  notifications: Notification[]
  myRank: number | null
  totalParticipants: number
}

export interface CampaignSwitcherItem {
  participantId: string
  campaignId: string
  campaignName: string
  campaignStatus: CampaignStatus
  clickCount: number
  nextThreshold: number | null
  isGoalReached: boolean
}

// ── CREATOR DASHBOARD ─────────────────────────────────

export interface CreatorActivityItem {
  type: 'join' | 'reward'
  display_name: string
  initial: string
  campaign_name: string
  detail: string
  created_at: string
}

export interface FraudFlag {
  campaign_name: string
  ip_address: string
  country: string | null
  fraud_reasons: string[]
  created_at: string
}

export interface CreatorRewardUnlock {
  display_name: string
  initial: string
  campaign_name: string
  reward_label: string
  unlocked_at: string
}

export interface CreatorTopParticipant {
  display_name: string
  initial: string
  click_count: number
  campaign_name: string
  is_goal_reached: boolean
}

export interface CreatorParticipant {
  id: string
  email: string
  click_count: number
  joined_at: string
  campaign_id: string
  campaign_name: string
  has_reward: boolean
}

export interface CreatorDashboardData {
  aggregate: {
    total_clicks: number
    total_participants: number
    active_campaigns: number
    rewards_delivered: number
    fraud_blocked: number
    viral_coefficient: number
  }
  top_campaign: { id: string; name: string; total_clicks: number } | null
  clicks_per_day_7: DailyClickData[]
  clicks_per_day_30: DailyClickData[]
  click_sources: { source: string; count: number; pct: number }[]
  geo_distribution: { country: string; count: number; pct: number }[]
  top_participants: CreatorTopParticipant[]
  recent_activity: CreatorActivityItem[]
  fraud_summary: { total: number; duplicate_ip: number; vpn_proxy: number; velocity: number }
  fraud_flags: FraudFlag[]
  reward_unlocks: CreatorRewardUnlock[]
  participants: CreatorParticipant[]
}
