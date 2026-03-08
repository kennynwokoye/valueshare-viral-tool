-- ============================================================
-- 005_leaderboard_rpc.sql
-- ValueShare — Campaign leaderboard RPC (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION get_campaign_leaderboard(
  p_campaign_id UUID,
  p_participant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_leaderboard JSONB;
  v_total_participants INTEGER;
  v_my_rank INTEGER;
BEGIN
  -- Total participants in this campaign
  SELECT COUNT(*)::integer INTO v_total_participants
  FROM participants
  WHERE campaign_id = p_campaign_id;

  -- Find the caller's rank
  SELECT rank_num INTO v_my_rank
  FROM (
    SELECT id, dense_rank() OVER (ORDER BY click_count DESC) AS rank_num
    FROM participants
    WHERE campaign_id = p_campaign_id
  ) ranked
  WHERE id = p_participant_id;

  -- Top 20 participants with anonymized display names
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.rank), '[]'::jsonb)
  INTO v_leaderboard
  FROM (
    SELECT
      dense_rank() OVER (ORDER BY p.click_count DESC)::integer AS rank,
      CASE
        WHEN length(split_part(p.email, '@', 1)) > 2
        THEN initcap(left(split_part(p.email, '@', 1), 1)) || '. ' || left(split_part(p.email, '@', 1), 1)
        ELSE initcap(split_part(p.email, '@', 1))
      END AS display_name,
      upper(left(split_part(p.email, '@', 1), 1)) AS initial,
      p.click_count,
      (p.id = p_participant_id) AS is_me,
      p.joined_at
    FROM participants p
    WHERE p.campaign_id = p_campaign_id
    ORDER BY p.click_count DESC, p.joined_at ASC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'leaderboard', v_leaderboard,
    'total_participants', v_total_participants,
    'my_rank', v_my_rank
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
