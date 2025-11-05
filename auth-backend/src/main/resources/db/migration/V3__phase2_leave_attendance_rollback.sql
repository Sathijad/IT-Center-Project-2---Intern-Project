-- Rollback script for Phase 2 Leave & Attendance Management
-- Run this script to undo V3 migration

-- Drop triggers
DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
DROP TRIGGER IF EXISTS update_leave_policies_updated_at ON leave_policies;

-- Drop functions
DROP FUNCTION IF EXISTS check_overlapping_leaves(BIGINT, DATE, DATE, BIGINT);
DROP FUNCTION IF EXISTS calculate_leave_days(DATE, DATE);

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS leave_audit CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_policies CASCADE;

