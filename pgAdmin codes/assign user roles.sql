-- Check structure of app_users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'app_users'
ORDER BY ordinal_position;

-- Check structure of user_roles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;





-- Check user roles and assign user roles
-- 1) Make sure roles exist (idempotent)
INSERT INTO roles (name) VALUES ('ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('EMPLOYEE') ON CONFLICT DO NOTHING;

-- Assign roles to users (with audit columns)
-- Assign ADMIN to Admin Test
-- Admin Test → ADMIN
INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
SELECT 2, r.id, now(), 2
FROM roles r
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = 2 AND ur.role_id = r.id
  );

-- User Test → EMPLOYEE
INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
SELECT 1, r.id, now(), 2
FROM roles r
WHERE r.name = 'EMPLOYEE'
  AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = 1 AND ur.role_id = r.id
  );


-- To confirm
SELECT u.display_name AS user_name, r.name AS role, a.display_name AS assigned_by, ur.assigned_at
FROM user_roles ur
JOIN app_users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN app_users a ON ur.assigned_by = a.id
ORDER BY u.display_name;




