-- IT Center Auth - Backfill Leave Balances for Existing Users
-- Flyway migration V11
-- Backfills leave balances for user IDs 1, 2, 3, 41 with full annual allocation

-- Full annual allocation for users (1,2,3,41)
INSERT INTO leave_balances (user_id, policy_id, balance_days, updated_at)
SELECT 
    u.id, 
    p.id, 
    COALESCE(p.max_days, 0) AS balance_days,
    CURRENT_TIMESTAMP
FROM app_users u
CROSS JOIN leave_policies p
WHERE u.id IN (1, 2, 3, 41)
  AND u.is_active = true
ON CONFLICT (user_id, policy_id) DO NOTHING;

-- Verify the backfill
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM leave_balances
    WHERE user_id IN (1, 2, 3, 41);
    
    RAISE NOTICE 'Backfilled leave balances for % rows', v_count;
END $$;

