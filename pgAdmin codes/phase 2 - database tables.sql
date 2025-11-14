
select * from users;

select * from attendance_logs;

select * from leave_requests;

select * from leave_audit;

select * from leave_balances;

select * from leave_policies;




SELECT datname FROM pg_database;









-- Phase 2 leave & attendance schema alignment (idempotent)
-- Ensures tables exist in shared itcenter_auth database with correct FKs and columns.

BEGIN;

CREATE TABLE IF NOT EXISTS leave_policies (
    policy_id      BIGSERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    description    VARCHAR(500),
    annual_limit   INTEGER      NOT NULL DEFAULT 0,
    carry_forward  INTEGER      NOT NULL DEFAULT 0,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE leave_policies
    ADD COLUMN IF NOT EXISTS description   VARCHAR(500),
    ADD COLUMN IF NOT EXISTS annual_limit  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS carry_forward INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS leave_requests (
    request_id     BIGSERIAL PRIMARY KEY,
    user_id        BIGINT      NOT NULL,
    policy_id      BIGINT      NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date     DATE        NOT NULL,
    end_date       DATE        NOT NULL,
    half_day       BOOLEAN     NOT NULL DEFAULT FALSE,
    reason         TEXT,
    graph_event_id VARCHAR(128),
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leave_requests_chk_dates CHECK (end_date >= start_date),
    CONSTRAINT leave_requests_chk_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS half_day       BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reason         TEXT,
    ADD COLUMN IF NOT EXISTS graph_event_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS user_email     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_name      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_team_id   BIGINT;

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_user_fk;

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_policy_fk;

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_policy_fk
        FOREIGN KEY (policy_id) REFERENCES leave_policies(policy_id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS leave_balances (
    balance_id    BIGSERIAL PRIMARY KEY,
    user_id       BIGINT   NOT NULL,
    policy_id     BIGINT   NOT NULL,
    balance_days  NUMERIC(10,2) NOT NULL DEFAULT 0,
    year          INTEGER  NOT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_id, year)
);

ALTER TABLE leave_balances
    ADD COLUMN IF NOT EXISTS balance_days NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS year         INTEGER       NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE leave_balances
    DROP CONSTRAINT IF EXISTS leave_balances_user_fk;

ALTER TABLE leave_balances
    DROP CONSTRAINT IF EXISTS leave_balances_policy_fk;

ALTER TABLE leave_balances
    ADD CONSTRAINT leave_balances_policy_fk
        FOREIGN KEY (policy_id) REFERENCES leave_policies(policy_id) ON DELETE RESTRICT;


CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id            BIGSERIAL PRIMARY KEY,
    user_id           BIGINT     NOT NULL,
    clock_in          TIMESTAMPTZ NOT NULL,
    clock_out         TIMESTAMPTZ,
    duration_minutes  INTEGER,
    latitude          NUMERIC(10,6),
    longitude         NUMERIC(10,6),
    source            VARCHAR(50),
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_clock_times_chk CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

ALTER TABLE attendance_logs
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS latitude         NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS longitude        NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS source           VARCHAR(50),
    ADD COLUMN IF NOT EXISTS created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS user_email       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_name        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_team_id     BIGINT;

ALTER TABLE attendance_logs
    DROP CONSTRAINT IF EXISTS attendance_logs_user_fk;

CREATE TABLE IF NOT EXISTS leave_audit (
    audit_id    BIGSERIAL PRIMARY KEY,
    request_id  BIGINT    NOT NULL,
    action      VARCHAR(50) NOT NULL,
    actor_id    BIGINT,
    notes       TEXT,
    metadata    JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE leave_audit
    ADD COLUMN IF NOT EXISTS notes      TEXT,
    ADD COLUMN IF NOT EXISTS metadata   JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS actor_name  VARCHAR(255);

ALTER TABLE leave_audit
    DROP CONSTRAINT IF EXISTS leave_audit_request_fk;

ALTER TABLE leave_audit
    ADD CONSTRAINT leave_audit_request_fk
        FOREIGN KEY (request_id) REFERENCES leave_requests(request_id) ON DELETE CASCADE;


ALTER TABLE leave_audit
    DROP CONSTRAINT IF EXISTS leave_audit_actor_fk;

-- Helpful indexes (created idempotently)
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created ON leave_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_team ON leave_requests(user_team_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_policy ON leave_balances(policy_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in ON attendance_logs(clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_out ON attendance_logs(clock_out DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_team ON attendance_logs(user_team_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_request ON leave_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_actor ON leave_audit(actor_id);

-- Updated trigger helper to keep updated_at current
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_policies_set_updated ON leave_policies;
CREATE TRIGGER trg_leave_policies_set_updated
    BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_leave_requests_set_updated ON leave_requests;
CREATE TRIGGER trg_leave_requests_set_updated
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_leave_balances_set_updated ON leave_balances;
CREATE TRIGGER trg_leave_balances_set_updated
    BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_attendance_logs_set_updated ON attendance_logs;
CREATE TRIGGER trg_attendance_logs_set_updated
    BEFORE UPDATE ON attendance_logs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Seed default policies (idempotent)
INSERT INTO leave_policies (name, description, annual_limit, carry_forward, is_active)
VALUES
    ('Annual Leave',  'Annual vacation leave entitlement', 14, 5, TRUE),
    ('Casual Leave',  'Casual leave for personal reasons', 7,  0, TRUE),
    ('Sick Leave',    'Medical leave entitlement',          10, 0, TRUE),
    ('Personal Leave','Personal time off',                  5,  0, TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    annual_limit = EXCLUDED.annual_limit,
    carry_forward = EXCLUDED.carry_forward,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;











-- User directory for Phase 2 services
-- Creates unified users table keyed by Cognito sub and seeds initial admin user.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    user_id       BIGSERIAL PRIMARY KEY,
    cognito_sub   VARCHAR(128) NOT NULL UNIQUE,
    email         VARCHAR(255),
    display_name  VARCHAR(255),
    team_id       BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cognito_sub  VARCHAR(128) NOT NULL,
    ADD COLUMN IF NOT EXISTS email        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS team_id      BIGINT,
    ADD COLUMN IF NOT EXISTS created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS users_cognito_sub_uq ON users (cognito_sub);

CREATE OR REPLACE FUNCTION set_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated ON users;
CREATE TRIGGER trg_users_set_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_users_updated_at();

-- Seed primary admin user (idempotent)
INSERT INTO users (cognito_sub, email, display_name)
VALUES ('495e04a8-5051-70d0-3e40-4305d8945778', 'admin@test.com', 'Admin User')
ON CONFLICT (cognito_sub) DO UPDATE
SET email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;




