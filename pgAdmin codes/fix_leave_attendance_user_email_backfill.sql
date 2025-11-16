-- Fix historical leave & attendance records that stored Cognito sub
-- instead of the real email address in user_email / user_name.
--
-- IMPORTANT:
-- - Run this against the Phase 2 database (leave/attendance backend).
-- - Review with your DBA before running in production.
-- - Always take a backup or snapshot first.

BEGIN;

-- ==============================
-- 1) Attendance logs
-- ==============================

-- Backfill user_email from users.email where it is missing or equals cognito_sub
UPDATE attendance_logs al
SET user_email = u.email
FROM users u
WHERE al.user_id = u.user_id
  AND (
    al.user_email IS NULL
    OR al.user_email = ''
    OR al.user_email = u.cognito_sub
  );

-- Optionally normalise user_name from display_name/email when missing
UPDATE attendance_logs al
SET user_name = COALESCE(u.display_name, u.email)
FROM users u
WHERE al.user_id = u.user_id
  AND (al.user_name IS NULL OR al.user_name = '');


-- ==============================
-- 2) Leave requests
-- ==============================

-- Backfill user_email from users.email where it is missing or equals cognito_sub
UPDATE leave_requests lr
SET user_email = u.email
FROM users u
WHERE lr.user_id = u.user_id
  AND (
    lr.user_email IS NULL
    OR lr.user_email = ''
    OR lr.user_email = u.cognito_sub
  );

-- Optionally normalise user_name from display_name/email when missing
UPDATE leave_requests lr
SET user_name = COALESCE(u.display_name, u.email)
FROM users u
WHERE lr.user_id = u.user_id
  AND (lr.user_name IS NULL OR lr.user_name = '');

COMMIT;


