-- ============================================================
-- Migration 005: Widget Enhancements
-- Adds customization columns, analytics tracking, and widget events
-- ============================================================

-- Add customization columns to embed_widgets
ALTER TABLE embed_widgets ADD COLUMN IF NOT EXISTS widget_accent_color TEXT DEFAULT '#e85d3a';
ALTER TABLE embed_widgets ADD COLUMN IF NOT EXISTS widget_success_headline TEXT;
ALTER TABLE embed_widgets ADD COLUMN IF NOT EXISTS widget_success_message TEXT;
ALTER TABLE embed_widgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Widget events table for analytics tracking
CREATE TABLE IF NOT EXISTS widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES embed_widgets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'submit')),
  referrer_domain TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widget_events_widget_id ON widget_events(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_created_at ON widget_events(created_at);

-- RLS for widget_events
ALTER TABLE widget_events ENABLE ROW LEVEL SECURITY;

-- Public can insert events (from embedded widgets on external sites)
CREATE POLICY "widget_events_insert_public"
  ON widget_events FOR INSERT
  WITH CHECK (true);

-- Creators can read their own widget events
CREATE POLICY "widget_events_select_creator"
  ON widget_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM embed_widgets ew
      JOIN campaigns c ON c.id = ew.campaign_id
      WHERE ew.id = widget_events.widget_id
        AND c.creator_id = auth.uid()
    )
  );
