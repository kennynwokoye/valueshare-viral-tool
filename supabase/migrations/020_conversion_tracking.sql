-- 020_conversion_tracking.sql
-- Real conversion tracking: sign-ups, purchases, shares via pixel/webhook
-- Adds conversions table + conversion_count on participants + reward unlock trigger

-- ── 1. Add conversion_count to participants ──────────────────────────────────
ALTER TABLE participants ADD COLUMN IF NOT EXISTS conversion_count INTEGER NOT NULL DEFAULT 0;

-- ── 2. Webhook secret on campaigns ──────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- ── 3. Conversions table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  campaign_id    UUID        NOT NULL REFERENCES campaigns(id)    ON DELETE CASCADE,
  ref_code       TEXT        NOT NULL,
  event_type     TEXT        NOT NULL DEFAULT 'conversion',
  metadata       JSONB       NOT NULL DEFAULT '{}',
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversions_ref_code    ON conversions(ref_code);
CREATE INDEX IF NOT EXISTS idx_conversions_participant ON conversions(participant_id);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign    ON conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created     ON conversions(created_at DESC);

-- ── 4. Trigger: increment conversion_count + check reward tiers ──────────────
CREATE OR REPLACE FUNCTION handle_conversion_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_participant participants%ROWTYPE;
  v_tier        reward_tiers%ROWTYPE;
BEGIN
  -- Increment conversion_count on the participant row
  UPDATE participants
  SET    conversion_count = conversion_count + 1,
         last_active_at   = NOW()
  WHERE  id = NEW.participant_id
  RETURNING * INTO v_participant;

  -- Check each reward tier; unlock if conversion_count meets threshold
  FOR v_tier IN
    SELECT * FROM reward_tiers
    WHERE  campaign_id = NEW.campaign_id
    ORDER  BY threshold ASC
  LOOP
    IF v_participant.conversion_count >= v_tier.threshold THEN
      INSERT INTO reward_unlocks (participant_id, tier_id, campaign_id, unlocked_at)
      VALUES (NEW.participant_id, v_tier.id, NEW.campaign_id, NOW())
      ON CONFLICT (participant_id, tier_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_conversion_insert ON conversions;
CREATE TRIGGER on_conversion_insert
  AFTER INSERT ON conversions
  FOR EACH ROW EXECUTE FUNCTION handle_conversion_insert();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversions_creator_select ON conversions;
CREATE POLICY conversions_creator_select ON conversions
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS conversions_participant_select ON conversions;
CREATE POLICY conversions_participant_select ON conversions
  FOR SELECT USING (
    participant_id IN (SELECT id FROM participants WHERE user_id = auth.uid())
  );

-- ── 6. Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
