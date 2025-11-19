-- Simple fix: Remove the problematic trigger and function
-- This is the quickest solution if you don't need automatic leave balance initialization

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_initialize_user_leave_balances ON app_users;

-- Drop the function
DROP FUNCTION IF EXISTS initialize_user_leave_balances() CASCADE;

-- Verify it's removed
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%leave_balance%';

SELECT 
    p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'initialize_user_leave_balances'
AND n.nspname = 'public';

