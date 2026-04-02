-- ============================================================
-- 018_cost_per_lead.sql
-- ValueShare — Cost-per-lead tracking + participant count fix
-- ============================================================

-- ── 1. Add cost-per-lead columns to campaigns ─────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS cost_per_lead NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_per_lead_currency VARCHAR(10) DEFAULT 'USD';

-- ── 2. Decrement trigger for participant deletions ─────────
--    Prevents total_participants from drifting above actual count
--    when participant rows are deleted (e.g. user account deletion).

CREATE OR REPLACE FUNCTION decrement_total_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET total_participants = GREATEST(total_participants - 1, 0)
  WHERE id = OLD.campaign_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_participant_delete ON participants;

CREATE TRIGGER after_participant_delete
  AFTER DELETE ON participants
  FOR EACH ROW EXECUTE FUNCTION decrement_total_participants();

-- ── 3. Repair existing data ────────────────────────────────
--    Recalculate total_participants from the live count so
--    any pre-existing drift (e.g. deleted participants) is fixed.

UPDATE campaigns c
SET total_participants = (
  SELECT COUNT(*)::integer
  FROM participants p
  WHERE p.campaign_id = c.id
);
