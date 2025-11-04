-- IT Center Auth - Leave Balances Schema Hardening
-- Flyway migration V10
-- This migration hardens the leave_balances table with proper constraints and defaults

-- 1) Ensure table exists (already created in V8, but adding safety check)
-- Table already exists from V8, so we skip CREATE TABLE

-- 2) Fix any existing NULL or negative values
UPDATE leave_balances
SET balance_days = 0
WHERE balance_days IS NULL OR balance_days < 0;

-- 3) Ensure NOT NULL constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leave_balances' 
        AND column_name = 'balance_days' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE leave_balances
        ALTER COLUMN balance_days SET NOT NULL;
    END IF;
END $$;

-- 4) Ensure DEFAULT constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leave_balances' 
        AND column_name = 'balance_days' 
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE leave_balances
        ALTER COLUMN balance_days SET DEFAULT 0;
    END IF;
END $$;

-- 5) Add check constraint to prevent negative balances (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chk_lb_nonneg'
    ) THEN
        ALTER TABLE leave_balances
        ADD CONSTRAINT chk_lb_nonneg CHECK (balance_days >= 0);
    END IF;
END $$;

-- 6) Ensure foreign key constraints exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lb_user'
    ) THEN
        ALTER TABLE leave_balances
        ADD CONSTRAINT fk_lb_user 
        FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lb_policy'
    ) THEN
        ALTER TABLE leave_balances
        ADD CONSTRAINT fk_lb_policy 
        FOREIGN KEY (policy_id) REFERENCES leave_policies(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 7) Ensure unique index exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'uq_leave_balances_user_policy'
    ) THEN
        CREATE UNIQUE INDEX uq_leave_balances_user_policy 
        ON leave_balances(user_id, policy_id);
    END IF;
END $$;

-- 8) Ensure updated_at has default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leave_balances' 
        AND column_name = 'updated_at' 
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE leave_balances
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

