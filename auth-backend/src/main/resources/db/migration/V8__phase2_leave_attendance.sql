-- Phase 2: Leave & Attendance Management Schema
-- Flyway migration V3

-- Leave Policies table
CREATE TABLE leave_policies (
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
CREATE TABLE leave_requests (
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
CREATE TABLE leave_balances (
    balance_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES leave_policies(policy_id) ON DELETE RESTRICT,
    balance_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_id, year)
);

-- Attendance Logs table
CREATE TABLE attendance_logs (
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
CREATE TABLE leave_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_policy ON leave_requests(policy_id);
CREATE INDEX idx_leave_requests_created ON leave_requests(created_at DESC);

CREATE INDEX idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX idx_leave_balances_policy ON leave_balances(policy_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);
CREATE INDEX idx_leave_balances_user_year ON leave_balances(user_id, year);

CREATE INDEX idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_clock_in ON attendance_logs(clock_in DESC);
CREATE INDEX idx_attendance_clock_out ON attendance_logs(clock_out DESC);
CREATE INDEX idx_attendance_user_date ON attendance_logs(user_id, clock_in DESC);
CREATE INDEX idx_attendance_geo ON attendance_logs USING GIN (geo_location);

CREATE INDEX idx_leave_audit_request ON leave_audit(request_id);
CREATE INDEX idx_leave_audit_actor ON leave_audit(actor_id);
CREATE INDEX idx_leave_audit_timestamp ON leave_audit(timestamp DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate leave duration in days
CREATE OR REPLACE FUNCTION calculate_leave_days(
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
BEGIN
    RETURN (p_end_date - p_start_date) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check overlapping leave requests
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

-- Seed default leave policies
INSERT INTO leave_policies (name, description, annual_limit, carry_forward) VALUES
    ('Annual Leave', 'Annual vacation leave entitlement', 14, 3),
    ('Casual Leave', 'Casual leave for personal reasons', 7, 0),
    ('Sick Leave', 'Medical leave entitlement', 10, 0),
    ('Personal Leave', 'Personal time off', 5, 0)
ON CONFLICT (name) DO NOTHING;

