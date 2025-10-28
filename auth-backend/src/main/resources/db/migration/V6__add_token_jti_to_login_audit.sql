-- V6: Add token JTI to login_audit for idempotent login tracking

-- Add token_jti column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'login_audit' AND column_name = 'token_jti'
  ) THEN
    ALTER TABLE login_audit
      ADD COLUMN token_jti TEXT NULL;
  END IF;
END $$;

-- Add unique index on token_jti
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'login_audit' AND indexname = 'uq_login_audit_jti'
  ) THEN
    CREATE UNIQUE INDEX uq_login_audit_jti
      ON login_audit (token_jti)
      WHERE token_jti IS NOT NULL;
  END IF;
END $$;

