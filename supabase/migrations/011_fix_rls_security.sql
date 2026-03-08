-- ============================================================
-- 011_fix_rls_security.sql
-- ValueShare — Security hardening migrations (2026-03-07)
-- ============================================================

-- ── H-2: Remove public token exposure on reward_unlocks ──────
-- The /prize/ route uses admin client + validate_reward_token RPC
-- (SECURITY DEFINER), so no public SELECT policy is needed.
DROP POLICY IF EXISTS "reward_unlocks_select_token_public" ON reward_unlocks;

-- ── H-3: Restrict INSERT policies to service_role only ───────
-- Previously WITH CHECK (true) allowed any authed user to insert
-- rows directly via the Supabase client SDK, bypassing fraud detection.

DROP POLICY IF EXISTS "referral_clicks_insert_service" ON referral_clicks;
DROP POLICY IF EXISTS "clicks_service_insert" ON referral_clicks;
CREATE POLICY "referral_clicks_insert_service"
  ON referral_clicks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "reward_unlocks_insert_service" ON reward_unlocks;
DROP POLICY IF EXISTS "unlocks_service_insert" ON reward_unlocks;
CREATE POLICY "reward_unlocks_insert_service"
  ON reward_unlocks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;
DROP POLICY IF EXISTS "notifications_service_insert" ON notifications;
CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── L-1: Fix duplicate SELECT policies on creator_profiles ───
-- Split the ALL policy into explicit operations (SELECT stays public).
DROP POLICY IF EXISTS "creator_profiles_all_own" ON creator_profiles;
DROP POLICY IF EXISTS "creator_profiles_insert_own" ON creator_profiles;
CREATE POLICY "creator_profiles_insert_own"
  ON creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "creator_profiles_update_own" ON creator_profiles;
CREATE POLICY "creator_profiles_update_own"
  ON creator_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
