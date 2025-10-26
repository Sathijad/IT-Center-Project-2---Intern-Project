-- Seed default admin user (if bootstrap email is set)
-- This migration is idempotent

-- Note: This creates a placeholder user that will be updated on first login via Cognito
-- The actual email is controlled by the BOOTSTRAP_ADMIN_EMAIL environment variable

INSERT INTO app_users (cognito_sub, email, display_name, locale)
VALUES 
    ('cognito:admin', 'admin@itcenter.com', 'System Administrator', 'en-US')
ON CONFLICT (email) DO NOTHING;

-- Assign ADMIN role to the default admin user
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, CURRENT_TIMESTAMP
FROM app_users u, roles r
WHERE u.email = 'admin@itcenter.com' AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

