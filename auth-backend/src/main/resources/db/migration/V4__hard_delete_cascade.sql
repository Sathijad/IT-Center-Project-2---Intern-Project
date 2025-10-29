-- Change login_audit to CASCADE delete (removes audit history when user is deleted)
-- user_roles already has ON DELETE CASCADE from V1

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find the actual FK constraint name on login_audit.user_id (if any)
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'login_audit'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  LIMIT 1;

  -- Drop it safely using the discovered name
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE login_audit DROP CONSTRAINT %I', fk_name);
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

