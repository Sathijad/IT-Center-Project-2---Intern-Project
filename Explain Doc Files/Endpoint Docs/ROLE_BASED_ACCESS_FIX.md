# Role-Based Access Control (RBAC) - Fixed

## Problem
The backend had role-based restrictions configured (`hasRole("ADMIN")` on `/api/v1/admin/**`) but they weren't working because:

1. **No JWT-to-Authorities Conversion**: Spring Security didn't know which roles users have
2. **Missing Database Role Mapping**: The JWT was validated but roles weren't loaded from the database
3. **Everyone treated equally**: All authenticated users had the same permissions

## Solution Implemented

### 1. Created JWT Authentication Converter

**File:** `auth-backend/src/main/java/com/itcenter/auth/config/JwtAuthConverter.java`

```java
@Component
@RequiredArgsConstructor
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        // 1. Extract sub claim from JWT
        // 2. Load user from database
        // 3. Get their roles
        // 4. Map to Spring Security authorities (ROLE_ADMIN, ROLE_EMPLOYEE)
        // 5. Return JwtAuthenticationToken with authorities
    }
}
```

**What it does:**
- Takes JWT token from request
- Extracts `sub` claim (Cognito user ID)
- Loads user from database using `cognitoSub`
- Gets their roles from `user.getRoles()`
- Maps each role to Spring Security authority (e.g., "ADMIN" → "ROLE_ADMIN")
- Creates authentication token with these authorities

### 2. Updated Security Configuration

**File:** `auth-backend/src/main/java/com/itcenter/auth/config/SecurityConfig.java`

**Changes:**
- Added `@RequiredArgsConstructor` for dependency injection
- Injected `JwtAuthConverter` bean
- Updated JWT configuration to use the custom converter:

```java
.oauth2ResourceServer(oauth2 -> oauth2
    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter))
)
```

### 3. How It Works Now

#### Request Flow
1. User makes request with JWT token
2. Spring validates JWT signature with Cognito
3. `JwtAuthConverter` intercepts validated JWT
4. Loads user from database by `cognitoSub`
5. Extracts roles (e.g., `["ADMIN", "EMPLOYEE"]`)
6. Maps to authorities (e.g., `[ROLE_ADMIN, ROLE_EMPLOYEE]`)
7. Creates `JwtAuthenticationToken` with authorities
8. Spring checks if user has required role

#### Authorization Checks
- `/api/v1/admin/**` requires `ROLE_ADMIN`
- Admin user with "ADMIN" role → ✅ Access granted
- Employee with "EMPLOYEE" role → ❌ 403 Forbidden

## Database Setup

### Ensure Roles Exist
```sql
-- Insert roles if they don't exist
INSERT INTO roles (name, description) 
VALUES ('ADMIN', 'Administrator with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) 
VALUES ('EMPLOYEE', 'Standard employee user')
ON CONFLICT (name) DO NOTHING;
```

### Assign Admin Role to User
```sql
-- Get your user's ID
SELECT id, email, cognito_sub FROM app_users;

-- Assign ADMIN role (replace <user_id> with actual ID)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u, roles r
WHERE u.email = 'your-email@example.com'
  AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
```

### Assign Employee Role on User Creation
The code already assigns EMPLOYEE role automatically when creating new users (see `UserProvisioningService.java` line 103).

## Testing

### Test 1: Admin Access
```bash
# Login as admin user
# Try to access /api/v1/admin/users

curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer <admin_access_token>"

# Expected: 200 OK with user list ✅
```

### Test 2: Employee Access (Should Fail)
```bash
# Login as employee user
# Try to access /api/v1/admin/users

curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer <employee_access_token>"

# Expected: 403 Forbidden ✅
```

### Test 3: Check Roles in Response
```bash
# Access your own profile
curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer <token>"

# Response should include:
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "roles": ["ADMIN"]  // or ["EMPLOYEE"]
}
```

## Logs to Watch

When a user makes a request, you'll now see:
```
Loaded 2 roles for user 092eb498-...: ROLE_ADMIN, ROLE_EMPLOYEE
```

Or:
```
No user or roles found for sub: xxx, assigning default ROLE_EMPLOYEE
```

## Frontend Integration

### Check User Roles
```typescript
const { user } = useAuth();

// Check if admin
if (user?.roles?.includes('ADMIN')) {
  // Show admin features
}

// Check if employee
if (user?.roles?.includes('EMPLOYEE')) {
  // Show employee features
}
```

### Protect Routes
```typescript
function RequireRole({ role, children }) {
  const { user } = useAuth();
  
  if (!user?.roles?.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Usage
<Route 
  path="/admin/users" 
  element={<RequireRole role="ADMIN"><Users /></RequireRole>} 
/>
```

### Conditional UI Rendering
```tsx
{user?.roles?.includes('ADMIN') && (
  <>
    <NavLink to="/admin/users">Users</NavLink>
    <NavLink to="/admin/audit">Audit Log</NavLink>
  </>
)}
```

## Authorization Matrix

| Endpoint | Employee | Admin |
|----------|----------|-------|
| `/api/v1/me` | ✅ | ✅ |
| `/api/v1/admin/users` | ❌ | ✅ |
| `/api/v1/admin/users/{id}` | ❌ | ✅ |
| `/api/v1/admin/audit` | ❌ | ✅ |

## How to Grant Admin Role

### Option 1: Via Database
```sql
-- Connect to database
psql -h localhost -U itcenter -d itcenter_auth

-- Find your user
SELECT id, email FROM app_users WHERE email = 'your-email@example.com';

-- Grant ADMIN role (replace <user_id> and <role_id>)
INSERT INTO user_roles (user_id, role_id)
VALUES (<user_id>, (SELECT id FROM roles WHERE name = 'ADMIN'))
ON CONFLICT DO NOTHING;
```

### Option 2: Via Admin API (Future)
```bash
# After creating an admin interface
PATCH /api/v1/admin/users/{id}/roles
{
  "roles": ["ADMIN", "EMPLOYEE"]
}
```

## Troubleshooting

### Issue: Getting 403 on /api/v1/admin/**
**Solution:** User doesn't have ADMIN role assigned

```sql
-- Check user's roles
SELECT u.email, r.name as role
FROM app_users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'your-email@example.com';

-- Grant ADMIN role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u, roles r
WHERE u.email = 'your-email@example.com'
  AND r.name = 'ADMIN';
```

### Issue: Roles not showing up in response
**Solution:** Check if roles are being loaded from database

```sql
-- Verify user has roles
SELECT u.*, r.name as role_name
FROM app_users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.cognito_sub = '<your_sub>';
```

### Issue: Default role not assigned
**Solution:** Check `UserProvisioningService` is assigning EMPLOYEE on creation (line 103)

## Summary

### Before Fix
- ❌ All users had same permissions
- ❌ `/api/v1/admin/**` accessible to everyone
- ❌ No role-based access control
- ❌ Database roles ignored

### After Fix
- ✅ Roles loaded from database
- ✅ Admin routes protected (403 for non-admins)
- ✅ Proper role-based access control
- ✅ Authorities mapped to Spring Security
- ✅ Default EMPLOYEE role on creation

## Next Steps

1. **Rebuild backend:**
   ```bash
   cd auth-backend
   mvn clean package -DskipTests
   ```

2. **Restart backend**

3. **Assign admin role to your user:**
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id
   FROM app_users u, roles r
   WHERE u.email = 'your-email@example.com'
     AND r.name = 'ADMIN';
   ```

4. **Test admin access** - Should now work! ✅

