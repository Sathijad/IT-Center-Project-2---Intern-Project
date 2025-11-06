-- Phase 2: Recreate Leave & Attendance Management Tables
-- Flyway migration V9
-- This migration safely recreates tables if they were dropped manually
-- Uses IF NOT EXISTS to prevent errors if tables already exist

-- Leave Policies table
CREATE TABLE IF NOT EXISTS leave_policies (
    policy_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    annual_limit INTEGER NOT NULL DEFAULT 0,
    carry_forward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    request_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES leave_policies(policy_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

-- Leave Balances table
CREATE TABLE IF NOT EXISTS leave_balances (
    balance_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES leave_policies(policy_id) ON DELETE RESTRICT,
    balance_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_id, year)
);

-- Attendance Logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    duration_minutes INTEGER,
    geo_location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_clock_times CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

-- Leave Audit table
CREATE TABLE IF NOT EXISTS leave_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    metadata JSONB
);

-- Indexes for performance (IF NOT EXISTS for PostgreSQL 9.5+)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for indexes directly,
-- so we'll use DO blocks to check existence first

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_user') THEN
        CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_status') THEN
        CREATE INDEX idx_leave_requests_status ON leave_requests(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_dates') THEN
        CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_policy') THEN
        CREATE INDEX idx_leave_requests_policy ON leave_requests(policy_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_created') THEN
        CREATE INDEX idx_leave_requests_created ON leave_requests(created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_balances_user') THEN
        CREATE INDEX idx_leave_balances_user ON leave_balances(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_balances_policy') THEN
        CREATE INDEX idx_leave_balances_policy ON leave_balances(policy_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_balances_year') THEN
        CREATE INDEX idx_leave_balances_year ON leave_balances(year);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_balances_user_year') THEN
        CREATE INDEX idx_leave_balances_user_year ON leave_balances(user_id, year);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_user') THEN
        CREATE INDEX idx_attendance_user ON attendance_logs(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_clock_in') THEN
        CREATE INDEX idx_attendance_clock_in ON attendance_logs(clock_in DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_clock_out') THEN
        CREATE INDEX idx_attendance_clock_out ON attendance_logs(clock_out DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_user_date') THEN
        CREATE INDEX idx_attendance_user_date ON attendance_logs(user_id, clock_in DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_geo') THEN
        CREATE INDEX idx_attendance_geo ON attendance_logs USING GIN (geo_location);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_audit_request') THEN
        CREATE INDEX idx_leave_audit_request ON leave_audit(request_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_audit_actor') THEN
        CREATE INDEX idx_leave_audit_actor ON leave_audit(actor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_audit_timestamp') THEN
        CREATE INDEX idx_leave_audit_timestamp ON leave_audit(timestamp DESC);
    END IF;
END $$;

-- Drop triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_leave_policies_updated_at ON leave_policies;
CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION calculate_leave_days(
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
BEGIN
    RETURN (p_end_date - p_start_date) + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_overlapping_leaves(
    p_user_id BIGINT,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_request_id BIGINT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO overlap_count
    FROM leave_requests
    WHERE user_id = p_user_id
      AND status = 'APPROVED'
      AND (p_exclude_request_id IS NULL OR request_id != p_exclude_request_id)
      AND (
          (start_date <= p_end_date AND end_date >= p_start_date)
      );
    
    RETURN overlap_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Seed default leave policies (ON CONFLICT ensures no duplicates)
INSERT INTO leave_policies (name, description, annual_limit, carry_forward) VALUES
    ('Annual Leave', 'Annual vacation leave entitlement', 14, 3),
    ('Casual Leave', 'Casual leave for personal reasons', 7, 0),
    ('Sick Leave', 'Medical leave entitlement', 10, 0),
    ('Personal Leave', 'Personal time off', 5, 0)
ON CONFLICT (name) DO NOTHING;

