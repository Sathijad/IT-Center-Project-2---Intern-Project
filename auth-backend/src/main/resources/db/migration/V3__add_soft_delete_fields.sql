-- Add soft delete support
ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Ensure active flag exists with default true (column already present as is_active)
ALTER TABLE app_users
    ALTER COLUMN is_active SET DEFAULT TRUE;

-- Helpful index (already created in V1 as idx_users_active); create if missing for idempotency
CREATE INDEX IF NOT EXISTS idx_users_active ON app_users(is_active);

