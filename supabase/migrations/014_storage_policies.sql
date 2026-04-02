-- ============================================================
-- 013_storage_policies.sql
-- ValueShare — Storage bucket RLS policies for file uploads
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Avatars bucket (creator profile photos) ──────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
CREATE POLICY "avatars_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- ── Campaign assets bucket (hero images) ─────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "campaign_assets_public_select" ON storage.objects;
CREATE POLICY "campaign_assets_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaign-assets');

DROP POLICY IF EXISTS "campaign_assets_auth_insert" ON storage.objects;
CREATE POLICY "campaign_assets_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-assets');

DROP POLICY IF EXISTS "campaign_assets_auth_update" ON storage.objects;
CREATE POLICY "campaign_assets_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-assets');

-- ── Reward files bucket (downloadable reward files) ───────────
-- Already created as private bucket — just add creator upload policy

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('reward-files', 'reward-files', false, 52428800)  -- 50 MB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reward_files_auth_insert" ON storage.objects;
CREATE POLICY "reward_files_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reward-files');

DROP POLICY IF EXISTS "reward_files_auth_select" ON storage.objects;
CREATE POLICY "reward_files_auth_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reward-files');
