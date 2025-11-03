-- V5: Add auditing columns to user_roles table

-- Add assigned_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE user_roles
      ADD COLUMN assigned_at TIMESTAMP NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Ensure trigger exists to set assigned_at when NULL (for @ManyToMany inserts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_assigned_at_if_null'
  ) THEN
    CREATE OR REPLACE FUNCTION set_assigned_at_if_null()
    RETURNS TRIGGER AS $trigger$
    BEGIN
        IF NEW.assigned_at IS NULL THEN
            NEW.assigned_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_assigned_at'
  ) THEN
    CREATE TRIGGER trigger_set_assigned_at
        BEFORE INSERT ON user_roles
        FOR EACH ROW
        WHEN (NEW.assigned_at IS NULL)
        EXECUTE FUNCTION set_assigned_at_if_null();
  END IF;
END $$;

-- Add assigned_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE user_roles
      ADD COLUMN assigned_by BIGINT NULL;
  END IF;
END $$;

-- Add foreign key constraint for assigned_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_roles_assigned_by'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES app_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update existing rows to have a default assigned_at if null
UPDATE user_roles 
SET assigned_at = NOW() 
WHERE assigned_at IS NULL;

