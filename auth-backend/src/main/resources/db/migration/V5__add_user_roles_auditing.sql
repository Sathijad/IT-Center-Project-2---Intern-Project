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

