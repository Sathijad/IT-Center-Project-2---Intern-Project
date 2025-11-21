INSERT INTO app_users (
  is_active,
  created_at,
  id,
  last_login,
  updated_at,
  locale,
  display_name,
  cognito_sub,
  email
) VALUES
-- 1) pasindu
(
  TRUE,
  '2025-10-27 23:10:19.019348',
  3,
  '2025-10-27 23:46:55.640177',
  '2025-10-29 12:47:56.019673',
  'en',
  'pasindumkurukulasuriya@gmail.com',
  '892e7408-e0d1-70ee-2557-c0ddaebb835b',
  'pasindumkurukulasuriya@gmail.com'
),
-- 2) yasela
(
  TRUE,
  '2025-10-29 15:49:45.175898',
  41,
  '2025-10-29 15:49:52.884202',
  '2025-11-12 09:55:05.893862',
  'en',
  'yasela2014@gmail.com',
  '79fef408-e031-7082-635b-cf6baa13f877',
  'yasela2014@gmail.com'
),
-- 3) user test
(
  TRUE,
  '2025-10-27 10:43:13.126648',
  1,
  '2025-11-16 10:57:35.840956',
  '2025-11-16 10:57:35.842957',
  'en',
  'User Test',
  '092eb498-4011-70ae-3812-275f7a37397f',
  'user@test.com'
),
-- 4) admin user
(
  TRUE,
  '2025-10-27 11:12:20.419326',
  2,
  '2025-11-20 09:05:29.796370',
  '2025-11-20 09:05:29.864204',
  'en-GB',
  'Admin User',
  '495e04a8-5051-70d0-3e40-4305d8945778',
  'admin@test.com'
),
-- 5) sathija
(
  TRUE,
  '2025-11-19 12:25:40.459964',
  63,
  '2025-11-20 09:08:54.088501',
  '2025-11-20 09:08:54.098083',
  'en',
  'Sathija d.',
  '393eb4d8-4041-70db-2fb4-af296cf3e072',
  'sathija.d@eyepax.com'
);













INSERT INTO user_roles (
    assigned_at,
    assigned_by,
    id,
    role_id,
    user_id
) VALUES (
    '2025-10-27 12:17:27.583357',
    2,
    1,
    1,
    2
);



INSERT INTO user_roles (
    assigned_at,
    assigned_by,
    id,
    role_id,
    user_id
) VALUES (
    '2025-11-06 17:12:42.714346',
    2,
    2,
    2,
    1
);


INSERT INTO user_roles (
    assigned_at,
    assigned_by,
    id,
    role_id,
    user_id
) VALUES (
    '2025-11-06 17:12:52.397720',
    2,
    3,
    2,
    3
);











-- Populate leave_balances for all users with all policies
-- This will only insert for users that don't already have balances
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
      -- Prevent duplicates - skip users that already have balances
      SELECT 1 
      FROM leave_balances lb 
      WHERE lb.user_id = u.id 
        AND lb.policy_id = p.policy_id 
        AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  );

-- Verify: Check how many rows were created
SELECT COUNT(*) as total_rows FROM leave_balances;

-- View all balances to confirm
SELECT 
    u.id as user_id,
    u.email,
    p.name as policy_name,
    lb.balance_days,
    lb.year
FROM leave_balances lb
JOIN app_users u ON lb.user_id = u.id
JOIN leave_policies p ON lb.policy_id = p.policy_id
ORDER BY u.id, p.name;
















