-- IT Center Auth - Auto-initialize Leave Balances Trigger
-- Flyway migration V12
-- Creates a trigger that automatically initializes leave balances when a new user is created

-- Function to initialize leave balances for a new user
CREATE OR REPLACE FUNCTION initialize_user_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert leave balances for all policies with full annual allocation
    INSERT INTO leave_balances (user_id, policy_id, balance_days, updated_at)
    SELECT 
        NEW.id, 
        p.id, 
        COALESCE(p.max_days, 0) AS balance_days,
        CURRENT_TIMESTAMP
    FROM leave_policies p
    ON CONFLICT (user_id, policy_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (idempotent - drop first if exists)
DROP TRIGGER IF EXISTS trigger_initialize_leave_balances ON app_users;

CREATE TRIGGER trigger_initialize_leave_balances
AFTER INSERT ON app_users
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION initialize_user_leave_balances();

-- Note: This trigger will automatically create balances for new users
-- If you prefer to call the service method instead, you can disable this trigger:
-- DROP TRIGGER trigger_initialize_leave_balances ON app_users;

