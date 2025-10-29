-- V3: Add constraints to user_roles table to prevent phantom user inserts

-- Ensure NOT NULL constraints (in case they don't exist)
ALTER TABLE user_roles
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN role_id SET NOT NULL;

-- Add unique constraint to prevent duplicate role assignments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_user_roles' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT uq_user_roles UNIQUE (user_id, role_id);
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_roles_user'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_roles_role'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
  END IF;
END $$;
