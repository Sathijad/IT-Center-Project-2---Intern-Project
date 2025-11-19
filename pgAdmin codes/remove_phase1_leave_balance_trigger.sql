-- Remove the problematic trigger that's preventing user creation in Phase 1
-- Phase 2 handles leave balances, so this trigger is not needed in Phase 1

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_initialize_user_leave_balances ON app_users;

-- Drop the function
DROP FUNCTION IF EXISTS initialize_user_leave_balances() CASCADE;

-- Verify it's removed
SELECT 
    'Triggers on app_users:' AS check_type,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'app_users';

SELECT 
    'Functions:' AS check_type,
    p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%leave_balance%'
AND n.nspname = 'public';

-- If the above queries return no rows, the trigger and function are successfully removed

