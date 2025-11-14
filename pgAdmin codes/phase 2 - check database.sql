SELECT balance_id, user_id, policy_id, balance_days, year
FROM leave_balances
WHERE user_id = 1;


SELECT request_id, user_id, policy_id, status, start_date, end_date, half_day,
       created_at, updated_at
FROM leave_requests
WHERE user_id = 1
ORDER BY request_id DESC;



SELECT policy_id, name
FROM leave_policies;






SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leave_policies'
ORDER BY ordinal_position;


ALTER TABLE leave_policies
    DROP CONSTRAINT IF EXISTS leave_policies_pkey;

ALTER TABLE leave_policies
    ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (policy_id);



UPDATE leave_policies
SET is_active = TRUE
WHERE is_active IS NULL OR is_active = FALSE;



INSERT INTO leave_policies (name, description, annual_limit, carry_forward, is_active)
VALUES
    ('Annual Leave',  'Annual vacation leave entitlement', 14, 5, TRUE),
    ('Casual Leave',  'Casual leave for personal reasons', 7,  0, TRUE),
    ('Sick Leave',    'Medical leave entitlement',          10, 0, TRUE),
    ('Personal Leave','Personal time off',                  5,  0, TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    annual_limit = EXCLUDED.annual_limit,
    carry_forward = EXCLUDED.carry_forward,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;



SELECT policy_id, name, is_active
FROM leave_policies
ORDER BY policy_id;






SELECT *
FROM leave_balances
WHERE user_id = 1
  AND policy_id = 1
  AND year = 2025;

SELECT user_id, cognito_sub, email, display_name
FROM users;

SELECT policy_id, name, annual_limit
FROM leave_policies
ORDER BY policy_id;





UPDATE leave_balances
SET balance_days = balance_days - 5
WHERE user_id = 1 AND policy_id = 1 AND year = 2025;





SELECT balance_id, user_id, policy_id, balance_days, year
FROM leave_balances
WHERE user_id = 1
  AND policy_id = 2   -- Casual Leave
  AND year = 2025;



