-- Migration 017: Add dual-role support
-- Adds 'both' to the user_role enum so a single account can act as
-- both creator and participant.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        AND enumlabel = 'both'
    ) THEN
      ALTER TYPE user_role ADD VALUE 'both';
    END IF;
  END IF;
END$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
