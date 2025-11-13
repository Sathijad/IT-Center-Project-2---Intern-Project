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


