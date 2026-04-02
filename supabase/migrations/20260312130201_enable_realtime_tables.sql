-- Enable Supabase Realtime on reward_unlocks and notifications tables
-- so real-time features (celebration overlay, live notifications) receive events.

-- Use DO block to avoid error if tables are already in the publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reward_unlocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reward_unlocks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;
