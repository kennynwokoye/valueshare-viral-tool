-- ============================================================
-- 012_landing_templates.sql
-- ValueShare — Landing page template support
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS landing_template TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS landing_config JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_campaigns_landing_template ON campaigns(landing_template);
