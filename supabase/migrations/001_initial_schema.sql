-- ============================================================
-- 001_initial_schema.sql
-- ValueShare — Tables, Indexes, Triggers
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABLES ─────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('creator', 'participant', 'admin')),
  country TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  template TEXT CHECK (template IN ('webinar_referral', 'ebook_giveaway', 'video_content', 'whatsapp_share', 'product_launch')),
  headline TEXT NOT NULL,
  subheadline TEXT,
  description TEXT,
  hero_image_url TEXT,
  hero_video_url TEXT,
  benefits JSONB DEFAULT '[]',
  how_it_works JSONB DEFAULT '[]',
  creator_display_name TEXT,
  creator_photo_url TEXT,
  destination_url TEXT NOT NULL,
  thankyou_page_url TEXT,
  kpi_type TEXT NOT NULL DEFAULT 'clicks' CHECK (kpi_type IN ('clicks', 'registrations', 'purchases', 'shares')),
  deadline TIMESTAMPTZ,
  show_countdown BOOLEAN DEFAULT true,
  participant_cap INTEGER,
  social_proof_visible BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  total_participants INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tier_order INTEGER NOT NULL DEFAULT 1,
  label TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('file', 'video_url', 'call_booking', 'external_url')),
  reward_label TEXT NOT NULL,
  reward_url TEXT,
  reward_file_path TEXT,
  reward_file_name TEXT,
  preview_teaser TEXT,
  access_duration_hours INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, tier_order)
);

CREATE TABLE campaign_promo_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

CREATE TABLE referral_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  fraud_score INTEGER DEFAULT 0,
  is_valid BOOLEAN DEFAULT true,
  fraud_reasons JSONB DEFAULT '[]',
  click_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES reward_tiers(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL,
  token_used_count INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  delivery_email_sent BOOLEAN DEFAULT false,
  UNIQUE(participant_id, tier_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reward_unlocked', 'progress_milestone', 'campaign_update', 'welcome')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE embed_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  widget_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  widget_headline TEXT,
  widget_subtext TEXT,
  widget_cta TEXT DEFAULT 'Get Your Free Link →',
  widget_theme TEXT DEFAULT 'light' CHECK (widget_theme IN ('light', 'dark')),
  widget_views INTEGER DEFAULT 0,
  widget_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────

CREATE INDEX idx_campaigns_creator_id ON campaigns(creator_id);
CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_participants_campaign_id ON participants(campaign_id);
CREATE INDEX idx_participants_referral_code ON participants(referral_code);
CREATE INDEX idx_referral_clicks_participant_id ON referral_clicks(participant_id);
CREATE INDEX idx_referral_clicks_ip_address ON referral_clicks(ip_address);
CREATE INDEX idx_referral_clicks_created_at ON referral_clicks(created_at);
CREATE INDEX idx_reward_unlocks_access_token ON reward_unlocks(access_token);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ── TRIGGER FUNCTION: updated_at ───────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_creator_profiles_updated_at
  BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── TRIGGER: increment click counts on valid referral click ─

CREATE OR REPLACE FUNCTION increment_click_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_valid = true THEN
    UPDATE participants
    SET click_count = click_count + 1,
        last_active_at = NOW()
    WHERE id = NEW.participant_id;

    UPDATE campaigns
    SET total_clicks = total_clicks + 1
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_referral_click_insert
  AFTER INSERT ON referral_clicks
  FOR EACH ROW EXECUTE FUNCTION increment_click_counts();

-- ── TRIGGER: increment total_participants on new participant ─

CREATE OR REPLACE FUNCTION increment_total_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET total_participants = total_participants + 1
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_participant_insert
  AFTER INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION increment_total_participants();
