-- Fix the initialize_user_leave_balances() function
-- This function is causing errors when creating new users

-- First, check if the function exists and see its definition
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'initialize_user_leave_balances'
AND n.nspname = 'public';

-- Drop the function if it exists (we'll recreate it correctly)
DROP FUNCTION IF EXISTS initialize_user_leave_balances() CASCADE;

-- Drop any triggers that use this function
DROP TRIGGER IF EXISTS trigger_initialize_user_leave_balances ON app_users;

-- If you want to keep the functionality, recreate it correctly:
-- The function should use NEW.id (from the trigger context) not p.id
CREATE OR REPLACE FUNCTION initialize_user_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
    policy_record RECORD;
    current_year INTEGER;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Initialize leave balances for all active leave policies
    FOR policy_record IN 
        SELECT policy_id, annual_limit 
        FROM leave_policies 
        WHERE is_active = true
    LOOP
        -- Insert leave balance for the new user
        -- Use NEW.id (the newly inserted user's id from the trigger)
        INSERT INTO leave_balances (user_id, policy_id, balance_days, year, updated_at)
        VALUES (NEW.id, policy_record.policy_id, policy_record.annual_limit, current_year, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, policy_id, year) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger on app_users table
CREATE TRIGGER trigger_initialize_user_leave_balances
    AFTER INSERT ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_leave_balances();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_initialize_user_leave_balances';

