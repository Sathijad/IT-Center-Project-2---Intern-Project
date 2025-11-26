-- Fix tasks_chk_priority constraint to match C# enum
-- Database had: Low, Medium, High, Urgent
-- C# enum has: Low, Medium, High, Critical
-- Update to include both Urgent and Critical for compatibility

BEGIN;

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_chk_priority;

-- Add new constraint that includes both Urgent and Critical
ALTER TABLE tasks 
    ADD CONSTRAINT tasks_chk_priority 
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent', 'Critical'));

COMMIT;

-- Verification
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'tasks_chk_priority'
        )
        THEN 'SUCCESS: Priority constraint updated to include Critical and Urgent'
        ELSE 'ERROR: Constraint update failed'
    END AS status;

