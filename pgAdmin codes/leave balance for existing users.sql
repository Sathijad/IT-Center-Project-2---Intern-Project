-- Populate leave_balances for all users with all policies
INSERT INTO leave_balances (user_id, policy_id, balance_days, year, updated_at)
SELECT 
    u.id as user_id,
    p.policy_id,
    p.annual_limit as balance_days,  -- Initial balance = annual limit
    EXTRACT(YEAR FROM CURRENT_DATE) as year,  -- Current year (2025)
    CURRENT_TIMESTAMP as updated_at
FROM app_users u
CROSS JOIN leave_policies p
WHERE u.is_active = true
  AND p.is_active = true
  AND NOT EXISTS (
      -- Prevent duplicates
      SELECT 1 
      FROM leave_balances lb 
      WHERE lb.user_id = u.id 
        AND lb.policy_id = p.policy_id 
        AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  );

-- Verify: Check how many rows were created
SELECT COUNT(*) as total_rows FROM leave_balances;

-- View all balances
SELECT 
    u.email,
    p.name as policy_name,
    lb.balance_days,
    lb.year
FROM leave_balances lb
JOIN app_users u ON lb.user_id = u.id
JOIN leave_policies p ON lb.policy_id = p.policy_id
ORDER BY u.email, p.name;