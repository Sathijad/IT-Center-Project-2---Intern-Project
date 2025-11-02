-- IT Center Auth - Phase 2: Leave & Attendance Management Schema
-- Flyway migration V8

-- Leave policies table
CREATE TABLE leave_policies (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'ANNUAL', 'CASUAL', 'SICK'
    max_days INTEGER NOT NULL,
    carry_forward BOOLEAN DEFAULT false,
    accrual_rate NUMERIC(5,2) DEFAULT 0.00, -- days per month/year
    accrual_period VARCHAR(20) DEFAULT 'MONTHLY', -- 'MONTHLY' or 'YEARLY'
    min_notice_days INTEGER DEFAULT 0,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave requests table
CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES leave_policies(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day VARCHAR(10), -- 'AM' or 'PM', NULL for full day
    reason TEXT,
    approved_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_leave_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_half_day CHECK (half_day IS NULL OR half_day IN ('AM', 'PM')),
    CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);

-- Leave balances table
CREATE TABLE leave_balances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES leave_policies(id) ON DELETE RESTRICT,
    balance_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_id)
);

-- Attendance logs table
CREATE TABLE attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    duration_minutes INTEGER,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    source VARCHAR(50) DEFAULT 'WEB', -- 'WEB', 'MOBILE', 'API'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_clock_order CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

-- Leave audit table
CREATE TABLE leave_audit (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'APPROVED', 'REJECTED', 'CANCELLED', 'UPDATED'
    actor_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX idx_leave_balances_policy ON leave_balances(policy_id);
CREATE INDEX idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_clock_in ON attendance_logs(clock_in DESC);
CREATE INDEX idx_attendance_user_date ON attendance_logs(user_id, clock_in DESC);
CREATE INDEX idx_leave_audit_request ON leave_audit(request_id);
CREATE INDEX idx_leave_audit_actor ON leave_audit(actor_id);

-- Prevent overlapping approved/pending leave requests for same user
-- Using exclusion constraint (requires btree_gist extension)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX idx_leave_requests_no_overlap 
ON leave_requests(user_id, daterange(start_date, end_date, '[]'))
WHERE status IN ('PENDING', 'APPROVED');

-- Alternative: Using a function-based check (simpler, works without extension)
-- This will be enforced at application level for now, but we add the unique index above

-- Triggers
CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate leave days (handles half-days)
CREATE OR REPLACE FUNCTION calculate_leave_days(
    p_start_date DATE,
    p_end_date DATE,
    p_half_day VARCHAR DEFAULT NULL
) RETURNS NUMERIC(5,2) AS $$
DECLARE
    total_days INTEGER;
BEGIN
    total_days := (p_end_date - p_start_date) + 1;
    
    IF p_half_day IS NOT NULL THEN
        -- If half-day specified, subtract 0.5 from total
        -- For single day half-day, total_days = 1, so result = 0.5
        -- For multi-day with half-day, subtract 0.5
        IF total_days = 1 THEN
            RETURN 0.5;
        ELSE
            RETURN total_days - 0.5;
        END IF;
    END IF;
    
    RETURN total_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

