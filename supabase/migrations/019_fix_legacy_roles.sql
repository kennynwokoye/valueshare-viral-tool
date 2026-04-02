-- ============================================================
-- 019_fix_legacy_roles.sql
-- ValueShare — Fix legacy creator accounts with participant records
-- ============================================================
-- Some creator accounts (role='creator') also joined campaigns as
-- participants. The middleware blocks role='creator' from /dashboard/participant,
-- so these accounts couldn't switch to participant view.
-- Setting role='both' allows access to both dashboards.

UPDATE users
SET role = 'both'
WHERE role = 'creator'
  AND EXISTS (
    SELECT 1 FROM participants WHERE participants.user_id = users.id
  );
