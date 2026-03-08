-- ── 008_creator_notifications.sql ──────────────────────────────────────────────
-- Extends NotificationType CHECK constraint and adds creator notification triggers
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Extend notification_type ENUM with creator notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_participant';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'fraud_spike';

-- 2. Creator notification when a participant joins
CREATE OR REPLACE FUNCTION notify_creator_new_participant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_creator_id UUID;
  v_campaign_name TEXT;
BEGIN
  SELECT creator_id, name
  INTO v_creator_id, v_campaign_name
  FROM campaigns
  WHERE id = NEW.campaign_id;

  INSERT INTO notifications (user_id, participant_id, campaign_id, type, title, message, data)
  VALUES (
    v_creator_id,
    NEW.id,
    NEW.campaign_id,
    'new_participant',
    'New participant joined',
    'Someone just joined ' || v_campaign_name,
    jsonb_build_object(
      'participant_email', NEW.email,
      'campaign_name', v_campaign_name
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_new_participant ON participants;
CREATE TRIGGER trg_notify_creator_new_participant
  AFTER INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_new_participant();

-- 3. Creator notification when a reward is unlocked
CREATE OR REPLACE FUNCTION notify_creator_reward_unlocked()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_creator_id UUID;
  v_campaign_name TEXT;
  v_reward_label TEXT;
BEGIN
  SELECT c.creator_id, c.name, rt.reward_label
  INTO v_creator_id, v_campaign_name, v_reward_label
  FROM campaigns c
  JOIN reward_tiers rt ON rt.id = NEW.tier_id
  WHERE c.id = NEW.campaign_id;

  INSERT INTO notifications (user_id, campaign_id, type, title, message, data)
  VALUES (
    v_creator_id,
    NEW.campaign_id,
    'reward_unlocked',
    'Reward earned: ' || v_reward_label,
    'A participant unlocked "' || v_reward_label || '" in ' || v_campaign_name,
    jsonb_build_object(
      'reward_label', v_reward_label,
      'campaign_name', v_campaign_name,
      'unlock_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_reward_unlocked ON reward_unlocks;
CREATE TRIGGER trg_notify_creator_reward_unlocked
  AFTER INSERT ON reward_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_reward_unlocked();
