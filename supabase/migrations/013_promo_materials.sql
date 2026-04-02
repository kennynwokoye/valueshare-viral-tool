-- Migration 013: Add promo materials / flyer pack columns to campaigns

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS flyer_image_url TEXT,
  ADD COLUMN IF NOT EXISTS flyer_caption   TEXT,
  ADD COLUMN IF NOT EXISTS require_flyer   BOOLEAN NOT NULL DEFAULT false;
