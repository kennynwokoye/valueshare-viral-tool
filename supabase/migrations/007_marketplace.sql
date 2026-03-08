-- ── 007_marketplace.sql ────────────────────────────────────────────
-- Adds opt-in marketplace listing flag to campaigns
-- and a public RPC that returns all marketplace-listed active campaigns
-- ────────────────────────────────────────────────────────────────────

-- 1. Add marketplace_listed column (creators opt-in per campaign)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS marketplace_listed BOOLEAN NOT NULL DEFAULT false;

-- 2. RPC: get_marketplace_campaigns() → JSONB
--    Returns every active + marketplace_listed campaign with creator info
--    and first reward tier. Callable by anon/authenticated.
CREATE OR REPLACE FUNCTION get_marketplace_campaigns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaigns JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                 c.id,
      'name',               c.name,
      'slug',               c.slug,
      'headline',           c.headline,
      'hero_image_url',     c.hero_image_url,
      'template',           c.template,
      'total_participants', c.total_participants,
      'participant_cap',    c.participant_cap,
      'deadline',           c.deadline,
      'created_at',         c.created_at,
      'creator_name',       cp.name,
      'creator_photo',      cp.photo_url,
      'first_tier', (
        SELECT jsonb_build_object(
          'label',        rt.label,
          'threshold',    rt.threshold,
          'reward_label', rt.reward_label,
          'reward_type',  rt.reward_type
        )
        FROM reward_tiers rt
        WHERE rt.campaign_id = c.id
        ORDER BY rt.tier_order ASC
        LIMIT 1
      )
    )
    ORDER BY c.total_participants DESC, c.created_at DESC
  )
  INTO v_campaigns
  FROM campaigns c
  LEFT JOIN creator_profiles cp ON cp.user_id = c.creator_id
  WHERE c.status = 'active'
    AND c.marketplace_listed = true;

  RETURN COALESCE(v_campaigns, '[]'::JSONB);
END;
$$;

-- Allow both anon and authenticated users to call this RPC
GRANT EXECUTE ON FUNCTION get_marketplace_campaigns() TO anon, authenticated;
