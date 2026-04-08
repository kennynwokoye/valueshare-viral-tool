-- 021_fix_conversion_trigger_and_notifications.sql
-- Fixes:
-- 1. handle_conversion_insert was missing token_expires_at (NOT NULL column),
--    causing every conversion insert to roll back silently.
-- 2. notifications CHECK constraint was missing fraud_spike and new_participant types.

-- ── 1. Fix handle_conversion_insert trigger ─────────────────────────────────────
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
      INSERT INTO reward_unlocks (
        participant_id, tier_id, campaign_id, unlocked_at, token_expires_at
      )
      VALUES (
        NEW.participant_id,
        v_tier.id,
        NEW.campaign_id,
        NOW(),
        NOW() + (COALESCE(v_tier.access_duration_hours, 72) || ' hours')::interval
      )
      ON CONFLICT (participant_id, tier_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ── 2. Fix notifications CHECK constraint ───────────────────────────────────────
-- Drop the old CHECK and recreate with all used types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'reward_unlocked',
    'progress_milestone',
    'campaign_update',
    'welcome',
    'fraud_spike',
    'new_participant'
  ));

-- ── 3. Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
