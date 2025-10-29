-- Verify and fix login_audit table schema
-- This script ensures the token_jti column and unique index exist

-- Check current database
SELECT current_database();

-- Add token_jti column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'login_audit' AND column_name = 'token_jti'
  ) THEN
    ALTER TABLE login_audit ADD COLUMN token_jti TEXT NULL;
    RAISE NOTICE 'Added token_jti column to login_audit table';
  ELSE
    RAISE NOTICE 'Column token_jti already exists in login_audit table';
  END IF;
END $$;

-- Add unique index on token_jti if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'login_audit' AND indexname = 'uq_login_audit_jti'
  ) THEN
    CREATE UNIQUE INDEX uq_login_audit_jti
      ON login_audit (token_jti)
      WHERE token_jti IS NOT NULL;
    RAISE NOTICE 'Created unique index uq_login_audit_jti on login_audit table';
  ELSE
    RAISE NOTICE 'Index uq_login_audit_jti already exists on login_audit table';
  END IF;
END $$;

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'login_audit' 
ORDER BY ordinal_position;

-- Show indexes on login_audit
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'login_audit';

-- Show recent audit entries to verify current state
SELECT 
    id, 
    event_type, 
    user_id, 
    token_jti, 
    created_at
FROM login_audit
ORDER BY id DESC
LIMIT 10;

-- Show user last_login status
SELECT 
    id, 
    email, 
    last_login
FROM app_users
ORDER BY id;

