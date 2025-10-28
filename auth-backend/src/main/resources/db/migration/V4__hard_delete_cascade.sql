-- Change login_audit to CASCADE delete (removes audit history when user is deleted)
-- user_roles already has ON DELETE CASCADE from V1

DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'login_audit' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE login_audit 
    DROP CONSTRAINT login_audit_user_id_fkey;
  END IF;
END$$;

-- Add CASCADE delete constraint
ALTER TABLE login_audit
  ADD CONSTRAINT login_audit_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES app_users(id)
  ON DELETE CASCADE;

-- Ensure user_id is NOT NULL for audit integrity
ALTER TABLE login_audit
  ALTER COLUMN user_id SET NOT NULL;

