-- ============================================================
-- 003_functions.sql
-- ValueShare — PostgreSQL functions and triggers
-- ============================================================

-- ── 1. handle_new_auth_user() ──────────────────────────

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'participant');

  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, v_role);

  IF v_role = 'creator' THEN
    INSERT INTO public.creator_profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── 2. generate_campaign_slug(campaign_name TEXT) ──────

CREATE OR REPLACE FUNCTION generate_campaign_slug(campaign_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Lowercase, replace spaces with hyphens, strip non-alphanumeric/hyphen chars
  base_slug := lower(trim(campaign_name));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(BOTH '-' FROM base_slug);

  final_slug := base_slug;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM campaigns WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ── 3. generate_referral_code() ────────────────────────

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM participants WHERE referral_code = code);
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ── 4. check_reward_tier_unlocks(p_participant_id UUID) ─

CREATE OR REPLACE FUNCTION check_reward_tier_unlocks(p_participant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_participant RECORD;
  v_tier RECORD;
  v_unlock_id UUID;
BEGIN
  -- Get participant details
  SELECT p.*, c.id AS camp_id
  INTO v_participant
  FROM participants p
  JOIN campaigns c ON c.id = p.campaign_id
  WHERE p.id = p_participant_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Find qualifying tiers not yet unlocked
  FOR v_tier IN
    SELECT rt.*
    FROM reward_tiers rt
    WHERE rt.campaign_id = v_participant.campaign_id
      AND rt.threshold <= v_participant.click_count
      AND NOT EXISTS (
        SELECT 1 FROM reward_unlocks ru
        WHERE ru.participant_id = p_participant_id
          AND ru.tier_id = rt.id
      )
    ORDER BY rt.tier_order ASC
  LOOP
    -- Create the reward unlock
    INSERT INTO reward_unlocks (
      participant_id,
      tier_id,
      campaign_id,
      token_expires_at
    ) VALUES (
      p_participant_id,
      v_tier.id,
      v_participant.campaign_id,
      NOW() + (v_tier.access_duration_hours || ' hours')::interval
    )
    RETURNING id INTO v_unlock_id;

    -- Create notification
    INSERT INTO notifications (
      user_id,
      participant_id,
      campaign_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_participant.user_id,
      p_participant_id,
      v_participant.campaign_id,
      'reward_unlocked',
      'Reward Unlocked: ' || v_tier.reward_label,
      'Congratulations! You reached ' || v_tier.threshold || ' referrals and unlocked "' || v_tier.reward_label || '".',
      jsonb_build_object(
        'tier_id', v_tier.id,
        'tier_label', v_tier.label,
        'reward_type', v_tier.reward_type,
        'reward_label', v_tier.reward_label,
        'unlock_id', v_unlock_id
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Trigger: auto-check reward tiers on click_count update ─

CREATE OR REPLACE FUNCTION trigger_check_reward_unlocks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.click_count > OLD.click_count THEN
    PERFORM check_reward_tier_unlocks(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_participant_click_count_update
  AFTER UPDATE OF click_count ON participants
  FOR EACH ROW EXECUTE FUNCTION trigger_check_reward_unlocks();

-- ── 6. validate_reward_token(p_token TEXT) ─────────────

CREATE OR REPLACE FUNCTION validate_reward_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_unlock RECORD;
  v_tier RECORD;
  v_participant RECORD;
BEGIN
  -- Find the unlock record
  SELECT * INTO v_unlock
  FROM reward_unlocks
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Token not found');
  END IF;

  -- Check expiry
  IF v_unlock.token_expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Token expired');
  END IF;

  -- Get tier details
  SELECT * INTO v_tier
  FROM reward_tiers
  WHERE id = v_unlock.tier_id;

  -- Get participant email
  SELECT * INTO v_participant
  FROM participants
  WHERE id = v_unlock.participant_id;

  -- Increment usage count
  UPDATE reward_unlocks
  SET token_used_count = token_used_count + 1
  WHERE id = v_unlock.id;

  RETURN jsonb_build_object(
    'valid', true,
    'reward_type', v_tier.reward_type,
    'reward_url', v_tier.reward_url,
    'reward_file_path', v_tier.reward_file_path,
    'reward_file_name', v_tier.reward_file_name,
    'reward_label', v_tier.reward_label,
    'participant_email', v_participant.email,
    'expires_at', v_unlock.token_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. generate_participant_otp(p_email TEXT) ──────────

CREATE OR REPLACE FUNCTION generate_participant_otp(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_participant RECORD;
  v_otp TEXT;
BEGIN
  -- Find the most recent participant with this email
  SELECT * INTO v_participant
  FROM participants
  WHERE email = p_email
  ORDER BY joined_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No participant found with this email');
  END IF;

  -- Generate 6-digit zero-padded OTP
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Update participant record
  UPDATE participants
  SET otp_code = v_otp,
      otp_expires_at = NOW() + interval '15 minutes'
  WHERE id = v_participant.id;

  RETURN jsonb_build_object(
    'success', true,
    'participant_id', v_participant.id,
    'otp', v_otp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. get_campaign_analytics(p_campaign_id UUID) ──────

CREATE OR REPLACE FUNCTION get_campaign_analytics(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_campaign RECORD;
  v_total_participants INTEGER;
  v_total_clicks INTEGER;
  v_conversion_rate NUMERIC;
  v_viral_coefficient NUMERIC;
  v_time_remaining_hours NUMERIC;
  v_top_participants JSONB;
  v_click_sources JSONB;
  v_clicks_per_day JSONB;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Campaign not found');
  END IF;

  v_total_participants := v_campaign.total_participants;
  v_total_clicks := v_campaign.total_clicks;

  -- Conversion rate
  IF v_total_clicks > 0 THEN
    v_conversion_rate := round((v_total_participants::numeric / v_total_clicks * 100), 2);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Viral coefficient
  IF v_total_participants > 0 THEN
    v_viral_coefficient := round((v_total_clicks::numeric / v_total_participants), 2);
  ELSE
    v_viral_coefficient := 0;
  END IF;

  -- Time remaining
  IF v_campaign.deadline IS NOT NULL AND v_campaign.deadline > NOW() THEN
    v_time_remaining_hours := round(EXTRACT(EPOCH FROM (v_campaign.deadline - NOW())) / 3600, 1);
  ELSE
    v_time_remaining_hours := NULL;
  END IF;

  -- Top 10 participants by click_count
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_top_participants
  FROM (
    SELECT email, click_count, joined_at
    FROM participants
    WHERE campaign_id = p_campaign_id
    ORDER BY click_count DESC
    LIMIT 10
  ) t;

  -- Click sources grouped
  SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
  INTO v_click_sources
  FROM (
    SELECT COALESCE(click_source, 'other') AS source, COUNT(*)::integer AS cnt
    FROM referral_clicks
    WHERE campaign_id = p_campaign_id AND is_valid = true
    GROUP BY COALESCE(click_source, 'other')
  ) t;

  -- Clicks per day (last 14 days)
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.date), '[]'::jsonb)
  INTO v_clicks_per_day
  FROM (
    SELECT d::date::text AS date, COALESCE(c.clicks, 0) AS clicks
    FROM generate_series(
      CURRENT_DATE - interval '13 days',
      CURRENT_DATE,
      interval '1 day'
    ) d
    LEFT JOIN (
      SELECT created_at::date AS click_date, COUNT(*)::integer AS clicks
      FROM referral_clicks
      WHERE campaign_id = p_campaign_id AND is_valid = true
        AND created_at >= CURRENT_DATE - interval '13 days'
      GROUP BY created_at::date
    ) c ON c.click_date = d::date
  ) t;

  RETURN jsonb_build_object(
    'total_participants', v_total_participants,
    'total_clicks', v_total_clicks,
    'conversion_rate', v_conversion_rate,
    'viral_coefficient', v_viral_coefficient,
    'time_remaining_hours', v_time_remaining_hours,
    'top_participants', v_top_participants,
    'click_sources', v_click_sources,
    'clicks_per_day', v_clicks_per_day
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
