-- Fix Leave Balances: Set default and fix NULL values
-- Run this script once to fix existing NULL balance_days and set default constraint

-- Step 1: Fix any existing NULL values by setting them to 0
UPDATE leave_balances
SET balance_days = 0
WHERE balance_days IS NULL;

-- Step 2: Set default value for balance_days column (if not already set)
-- Note: This will only work if the column doesn't already have a default
-- If it fails, the default may already be set, which is fine
DO $$
BEGIN
    -- Check if default already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leave_balances' 
        AND column_name = 'balance_days' 
        AND column_default IS NOT NULL
    ) THEN
        -- Set default to 0
        ALTER TABLE leave_balances
        ALTER COLUMN balance_days SET DEFAULT 0;
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN balance_days IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN balance_days < 0 THEN 1 END) as negative_count
FROM leave_balances;

-- If null_count > 0, there may be a constraint issue
-- If negative_count > 0, you may want to set those to 0 as well

