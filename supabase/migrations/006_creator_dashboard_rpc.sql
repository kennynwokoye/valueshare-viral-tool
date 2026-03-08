-- ============================================================
-- 006_creator_dashboard_rpc.sql
-- ValueShare — Creator dashboard aggregate RPC (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION get_creator_dashboard(p_creator_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_campaign_ids        UUID[];
  v_total_clicks        INTEGER;
  v_total_participants  INTEGER;
  v_active_campaigns    INTEGER;
  v_rewards_delivered   INTEGER;
  v_fraud_blocked       INTEGER;
  v_viral_coefficient   NUMERIC;
  v_top_campaign        JSONB;
  v_clicks_per_day_7    JSONB;
  v_clicks_per_day_30   JSONB;
  v_click_sources       JSONB;
  v_geo_distribution    JSONB;
  v_top_participants    JSONB;
  v_recent_activity     JSONB;
  v_fraud_summary       JSONB;
  v_fraud_flags         JSONB;
  v_reward_unlocks      JSONB;
BEGIN
  -- ── Collect campaign IDs for this creator ─────────────
  SELECT ARRAY_AGG(id) INTO v_campaign_ids
  FROM campaigns
  WHERE creator_id = p_creator_id;

  -- Short-circuit if no campaigns
  IF v_campaign_ids IS NULL OR array_length(v_campaign_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'aggregate', jsonb_build_object(
        'total_clicks', 0, 'total_participants', 0,
        'active_campaigns', 0, 'rewards_delivered', 0,
        'fraud_blocked', 0, 'viral_coefficient', 0
      ),
      'top_campaign', NULL,
      'clicks_per_day_7', '[]'::jsonb,
      'clicks_per_day_30', '[]'::jsonb,
      'click_sources', '[]'::jsonb,
      'geo_distribution', '[]'::jsonb,
      'top_participants', '[]'::jsonb,
      'recent_activity', '[]'::jsonb,
      'fraud_summary', jsonb_build_object('total', 0, 'duplicate_ip', 0, 'vpn_proxy', 0, 'velocity', 0),
      'fraud_flags', '[]'::jsonb,
      'reward_unlocks', '[]'::jsonb
    );
  END IF;

  -- ── Aggregate KPIs ────────────────────────────────────
  SELECT
    COALESCE(SUM(total_clicks), 0)::integer,
    COALESCE(SUM(total_participants), 0)::integer,
    COUNT(*) FILTER (WHERE status = 'active')::integer
  INTO v_total_clicks, v_total_participants, v_active_campaigns
  FROM campaigns
  WHERE creator_id = p_creator_id;

  -- Viral coefficient
  IF v_total_participants > 0 THEN
    v_viral_coefficient := round((v_total_clicks::numeric / v_total_participants), 2);
  ELSE
    v_viral_coefficient := 0;
  END IF;

  -- Rewards delivered
  SELECT COUNT(*)::integer INTO v_rewards_delivered
  FROM reward_unlocks
  WHERE campaign_id = ANY(v_campaign_ids);

  -- Fraud blocked (invalid clicks)
  SELECT COUNT(*)::integer INTO v_fraud_blocked
  FROM referral_clicks
  WHERE campaign_id = ANY(v_campaign_ids) AND is_valid = false;

  -- ── Top campaign ──────────────────────────────────────
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'total_clicks', total_clicks
  ) INTO v_top_campaign
  FROM campaigns
  WHERE creator_id = p_creator_id
  ORDER BY total_clicks DESC
  LIMIT 1;

  -- ── Clicks per day — last 7 days ──────────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.date), '[]'::jsonb)
  INTO v_clicks_per_day_7
  FROM (
    SELECT d::date::text AS date, COALESCE(c.clicks, 0) AS clicks
    FROM generate_series(
      CURRENT_DATE - interval '6 days',
      CURRENT_DATE,
      interval '1 day'
    ) d
    LEFT JOIN (
      SELECT created_at::date AS click_date, COUNT(*)::integer AS clicks
      FROM referral_clicks
      WHERE campaign_id = ANY(v_campaign_ids)
        AND is_valid = true
        AND created_at >= CURRENT_DATE - interval '6 days'
      GROUP BY created_at::date
    ) c ON c.click_date = d::date
  ) t;

  -- ── Clicks per day — last 30 days ─────────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.date), '[]'::jsonb)
  INTO v_clicks_per_day_30
  FROM (
    SELECT d::date::text AS date, COALESCE(c.clicks, 0) AS clicks
    FROM generate_series(
      CURRENT_DATE - interval '29 days',
      CURRENT_DATE,
      interval '1 day'
    ) d
    LEFT JOIN (
      SELECT created_at::date AS click_date, COUNT(*)::integer AS clicks
      FROM referral_clicks
      WHERE campaign_id = ANY(v_campaign_ids)
        AND is_valid = true
        AND created_at >= CURRENT_DATE - interval '29 days'
      GROUP BY created_at::date
    ) c ON c.click_date = d::date
  ) t;

  -- ── Click sources ─────────────────────────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.count DESC), '[]'::jsonb)
  INTO v_click_sources
  FROM (
    SELECT
      COALESCE(click_source, 'other') AS source,
      COUNT(*)::integer AS count,
      round(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
    FROM referral_clicks
    WHERE campaign_id = ANY(v_campaign_ids)
      AND is_valid = true
    GROUP BY COALESCE(click_source, 'other')
  ) t;

  -- ── Geographic distribution ───────────────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.count DESC), '[]'::jsonb)
  INTO v_geo_distribution
  FROM (
    SELECT
      COALESCE(country, 'Unknown') AS country,
      COUNT(*)::integer AS count,
      round(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
    FROM referral_clicks
    WHERE campaign_id = ANY(v_campaign_ids)
      AND is_valid = true
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) t;

  -- ── Top 5 participants across all campaigns ───────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_top_participants
  FROM (
    SELECT
      initcap(left(split_part(p.email, '@', 1), 1)) || '. ' ||
        CASE WHEN length(split_part(p.email, '@', 1)) > 2
          THEN left(split_part(split_part(p.email, '@', 1), '.', 1), 1)
          ELSE ''
        END AS display_name,
      upper(left(split_part(p.email, '@', 1), 1)) AS initial,
      p.click_count,
      c.name AS campaign_name,
      EXISTS (
        SELECT 1 FROM reward_unlocks ru WHERE ru.participant_id = p.id
      ) AS is_goal_reached
    FROM participants p
    JOIN campaigns c ON c.id = p.campaign_id
    WHERE c.creator_id = p_creator_id
    ORDER BY p.click_count DESC
    LIMIT 5
  ) t;

  -- ── Recent activity (joins + reward unlocks) ──────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_recent_activity
  FROM (
    -- New participant joins
    SELECT
      'join' AS type,
      initcap(left(split_part(p.email, '@', 1), 1)) || '.' AS display_name,
      upper(left(split_part(p.email, '@', 1), 1)) AS initial,
      c.name AS campaign_name,
      'joined the campaign' AS detail,
      p.joined_at AS created_at
    FROM participants p
    JOIN campaigns c ON c.id = p.campaign_id
    WHERE c.creator_id = p_creator_id

    UNION ALL

    -- Reward unlocks
    SELECT
      'reward' AS type,
      initcap(left(split_part(p.email, '@', 1), 1)) || '.' AS display_name,
      upper(left(split_part(p.email, '@', 1), 1)) AS initial,
      c.name AS campaign_name,
      'unlocked: ' || rt.reward_label AS detail,
      ru.unlocked_at AS created_at
    FROM reward_unlocks ru
    JOIN participants p ON p.id = ru.participant_id
    JOIN campaigns c ON c.id = ru.campaign_id
    JOIN reward_tiers rt ON rt.id = ru.tier_id
    WHERE c.creator_id = p_creator_id

    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  -- ── Fraud summary ─────────────────────────────────────
  SELECT jsonb_build_object(
    'total', COUNT(*)::integer,
    'duplicate_ip', COUNT(*) FILTER (
      WHERE fraud_reasons::text ILIKE '%duplicate%' OR fraud_reasons::text ILIKE '%dup%'
    )::integer,
    'vpn_proxy', COUNT(*) FILTER (
      WHERE fraud_reasons::text ILIKE '%vpn%' OR fraud_reasons::text ILIKE '%proxy%'
    )::integer,
    'velocity', COUNT(*) FILTER (
      WHERE fraud_reasons::text ILIKE '%velocity%' OR fraud_reasons::text ILIKE '%fast%'
    )::integer
  )
  INTO v_fraud_summary
  FROM referral_clicks
  WHERE campaign_id = ANY(v_campaign_ids) AND is_valid = false;

  -- ── Fraud flags (recent 20) ───────────────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_fraud_flags
  FROM (
    SELECT
      c.name AS campaign_name,
      rc.ip_address,
      rc.country,
      rc.fraud_reasons,
      rc.created_at
    FROM referral_clicks rc
    JOIN campaigns c ON c.id = rc.campaign_id
    WHERE rc.campaign_id = ANY(v_campaign_ids)
      AND rc.is_valid = false
    ORDER BY rc.created_at DESC
    LIMIT 20
  ) t;

  -- ── Recent reward unlocks (last 20) ───────────────────
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.unlocked_at DESC), '[]'::jsonb)
  INTO v_reward_unlocks
  FROM (
    SELECT
      initcap(left(split_part(p.email, '@', 1), 1)) || '.' AS display_name,
      upper(left(split_part(p.email, '@', 1), 1)) AS initial,
      c.name AS campaign_name,
      rt.reward_label,
      ru.unlocked_at
    FROM reward_unlocks ru
    JOIN participants p ON p.id = ru.participant_id
    JOIN campaigns c ON c.id = ru.campaign_id
    JOIN reward_tiers rt ON rt.id = ru.tier_id
    WHERE ru.campaign_id = ANY(v_campaign_ids)
    ORDER BY ru.unlocked_at DESC
    LIMIT 20
  ) t;

  -- ── Return ────────────────────────────────────────────
  RETURN jsonb_build_object(
    'aggregate', jsonb_build_object(
      'total_clicks',       v_total_clicks,
      'total_participants', v_total_participants,
      'active_campaigns',   v_active_campaigns,
      'rewards_delivered',  v_rewards_delivered,
      'fraud_blocked',      v_fraud_blocked,
      'viral_coefficient',  v_viral_coefficient
    ),
    'top_campaign',       v_top_campaign,
    'clicks_per_day_7',   v_clicks_per_day_7,
    'clicks_per_day_30',  v_clicks_per_day_30,
    'click_sources',      v_click_sources,
    'geo_distribution',   v_geo_distribution,
    'top_participants',   v_top_participants,
    'recent_activity',    v_recent_activity,
    'fraud_summary',      v_fraud_summary,
    'fraud_flags',        v_fraud_flags,
    'reward_unlocks',     v_reward_unlocks
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
