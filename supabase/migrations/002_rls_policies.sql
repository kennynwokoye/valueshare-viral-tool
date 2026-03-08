-- ============================================================
-- 002_rls_policies.sql
-- ValueShare — Row Level Security policies
-- ============================================================

-- ── ENABLE RLS ON ALL TABLES ───────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_promo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_widgets ENABLE ROW LEVEL SECURITY;

-- ── USERS ──────────────────────────────────────────────

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── CREATOR PROFILES ───────────────────────────────────

CREATE POLICY "creator_profiles_all_own"
  ON creator_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_profiles_select_public"
  ON creator_profiles FOR SELECT
  USING (true);

-- ── CAMPAIGNS ──────────────────────────────────────────

CREATE POLICY "campaigns_select_creator"
  ON campaigns FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "campaigns_insert_creator"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "campaigns_update_creator"
  ON campaigns FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "campaigns_delete_creator"
  ON campaigns FOR DELETE
  USING (auth.uid() = creator_id);

CREATE POLICY "campaigns_select_active_public"
  ON campaigns FOR SELECT
  USING (status = 'active');

-- ── REWARD TIERS ───────────────────────────────────────

CREATE POLICY "reward_tiers_all_creator"
  ON reward_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = reward_tiers.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = reward_tiers.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "reward_tiers_select_active_public"
  ON reward_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = reward_tiers.campaign_id
        AND campaigns.status = 'active'
    )
  );

-- ── CAMPAIGN PROMO ASSETS ──────────────────────────────

CREATE POLICY "promo_assets_all_creator"
  ON campaign_promo_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_promo_assets.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_promo_assets.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "promo_assets_select_participant"
  ON campaign_promo_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.campaign_id = campaign_promo_assets.campaign_id
        AND participants.user_id = auth.uid()
    )
  );

-- ── PARTICIPANTS ───────────────────────────────────────

CREATE POLICY "participants_select_own"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "participants_insert_own"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "participants_update_own"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "participants_select_creator"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = participants.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

-- ── REFERRAL CLICKS ────────────────────────────────────

CREATE POLICY "referral_clicks_select_participant"
  ON referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = referral_clicks.participant_id
        AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "referral_clicks_select_creator"
  ON referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = referral_clicks.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "referral_clicks_insert_service"
  ON referral_clicks FOR INSERT
  WITH CHECK (true);

-- ── REWARD UNLOCKS ─────────────────────────────────────

CREATE POLICY "reward_unlocks_select_participant"
  ON reward_unlocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = reward_unlocks.participant_id
        AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "reward_unlocks_select_creator"
  ON reward_unlocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = reward_unlocks.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "reward_unlocks_insert_service"
  ON reward_unlocks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "reward_unlocks_select_token_public"
  ON reward_unlocks FOR SELECT
  USING (true);

-- ── NOTIFICATIONS ──────────────────────────────────────

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ── EMBED WIDGETS ──────────────────────────────────────

CREATE POLICY "embed_widgets_all_creator"
  ON embed_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = embed_widgets.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = embed_widgets.campaign_id
        AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "embed_widgets_select_public"
  ON embed_widgets FOR SELECT
  USING (true);
