# User Roles Auditing & Idempotent Login Tracking

## Overview

This document describes the implementation of two key features:
1. **User Roles Auditing**: Automatically track who assigned roles and when
2. **Idempotent Login Tracking**: Prevent duplicate login audit entries on page refreshes

## A) User Roles Auditing Implementation

### 1. Database Schema Changes

**Migration: `V5__add_user_roles_auditing.sql`**
- Added `assigned_at` column (timestamp, NOT NULL)
- Added `assigned_by` column (BIGINT, nullable FK to app_users)
- Added foreign key constraint to `app_users(id)` with `ON DELETE SET NULL`

```sql
ALTER TABLE user_roles
  ADD COLUMN assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN assigned_by BIGINT NULL;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES app_users(id) ON DELETE SET NULL;
```

### 2. JPA Entity Updates

**File: `UserRole.java`**

Changed from:
- `@CreationTimestamp` with `LocalDateTime`
- Manual relationship to `AppUser assignedBy`

To:
- `@CreatedDate` with `Instant` (standard JPA auditing)
- `@CreatedBy` with `Long assignedBy` (automatically populated by AuditorAware)
- `@EntityListeners(AuditingEntityListener.class)` for automatic auditing

```java
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "user_roles", ...)
public class UserRole {
    @CreatedDate
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;
    
    @CreatedBy
    @Column(name = "assigned_by")
    private Long assignedBy;
}
```

### 3. AuditorAware Configuration

**File: `JpaAuditingConfig.java`** (NEW)

Created a custom `AuditorAware<Long>` that:
- Extracts the current authenticated user from SecurityContext
- Looks up the user's ID via `UserProvisioningService`
- Automatically populates `assignedBy` when new `UserRole` entities are saved

```java
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {
    @Bean
    public AuditorAware<Long> auditorAware() {
        return () -> {
            // Extract user from JWT and return their ID
            // This ID is automatically set as @CreatedBy
        };
    }
}
```

### 4. How It Works

When an admin assigns a role to a user:

1. `UserService.updateUserRoles()` creates a new `UserRole` entity
2. JPA Auditing EntityListener intercepts the save
3. `@CreatedDate` sets `assignedAt` to current timestamp
4. `AuditorAware` extracts current user's ID from SecurityContext
5. `@CreatedBy` sets `assignedBy` to the current user's ID
6. Entity is persisted with both fields populated

**No additional code needed in the service layer!** The auditing happens automatically.

### 5. Query Updates

Updated `UserRoleRepository` queries to remove references to `assignedBy` as an entity (it's now just a Long FK).

## B) Idempotent Login Tracking

### Problem

Previously, every call to `/api/v1/me` would:
- Create a new `LOGIN_SUCCESS` audit entry
- Update `last_login` timestamp
- Result in duplicate logs on every page refresh

### Solution

Implement idempotent login tracking using JWT's `jti` (JWT ID) claim to ensure each token is only logged once.

### 1. Database Schema Changes

**Migration: `V6__add_token_jti_to_login_audit.sql`**
- Added `token_jti` column (TEXT, nullable)
- Added unique index on `token_jti` (allows multiple NULLs)

```sql
ALTER TABLE login_audit
  ADD COLUMN token_jti TEXT NULL;

CREATE UNIQUE INDEX uq_login_audit_jti
  ON login_audit (token_jti)
  WHERE token_jti IS NOT NULL;
```

### 2. Entity Updates

**File: `LoginAudit.java`**

Added field:
```java
@Column(name = "token_jti")
private String tokenJti;
```

### 3. Repository Updates

**File: `LoginAuditRepository.java`**

Added method:
```java
boolean existsByTokenJti(String tokenJti);
```

### 4. Session Service & Controller

**New Files:**
- `SessionService.java` - Handles idempotent login marking
- `SessionController.java` - Exposes `/api/v1/sessions/mark-login` endpoint

**How it works**, in `SessionService.markLogin()`:

1. Extract `jti` from JWT (fallback to `sub + iat` if not present)
2. Check if this `jti` has already been recorded
3. If yes: return immediately (idempotent)
4. If no:
   - Find or create user from JWT
   - Create `LoginAudit` entry with `tokenJti`
   - Update `app_users.last_login`
   - Save both

```java
@Transactional
public void markLogin(Jwt jwt) {
    String jti = jwt.getId();
    
    if (auditRepository.existsByTokenJti(jti)) {
        return; // Already recorded
    }
    
    // Record login...
}
```

### 5. Frontend Integration

**File: `Callback.tsx`**

Added call to mark-login after successful OAuth flow:

```typescript
// After fetching user profile
await api.post('/api/v1/sessions/mark-login');
```

### 6. UserService Changes

**File: `UserService.java`**

Removed login audit logging from `getCurrentUserProfile()` method. Now only the dedicated endpoint handles it.

## Testing Guide

### A) Test User Roles Auditing

1. **Assign a role via Admin UI:**
   ```bash
   # Call the API
   curl -X PATCH http://localhost:8080/api/v1/admin/users/{userId}/roles \
     -H "Authorization: Bearer <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"roles":["ADMIN","EMPLOYEE"]}'
   ```

2. **Verify in database:**
   ```sql
   SELECT ur.*, u.email as user_email, r.name as role_name
   FROM user_roles ur
   JOIN app_users u ON ur.user_id = u.id
   JOIN roles r ON ur.role_id = r.id
   ORDER BY ur.assigned_at DESC
   LIMIT 10;
   ```

3. **Expected results:**
   - `assigned_at` = Current timestamp
   - `assigned_by` = ID of the admin who assigned the role
   - No manual setter calls needed in service code

### B) Test Idempotent Login

1. **Login via frontend:**
   - Navigate to login page
   - Complete OAuth flow

2. **Check audit log:**
   ```sql
   SELECT la.*, u.email
   FROM login_audit la
   JOIN app_users u ON la.user_id = u.id
   WHERE la.event_type = 'LOGIN_SUCCESS'
   ORDER BY la.created_at DESC
   LIMIT 10;
   ```

3. **Refresh page multiple times:**
   - Should NOT create new login audit entries
   - `last_login` should NOT change

4. **Verify JTI tracking:**
   ```sql
   SELECT token_jti, COUNT(*) as count
   FROM login_audit
   WHERE event_type = 'LOGIN_SUCCESS'
   AND token_jti IS NOT NULL
   GROUP BY token_jti
   HAVING COUNT(*) > 1;
   ```
   Should return 0 rows (each JTI appears only once)

5. **Logout and login again:**
   - This creates a NEW JWT with a different `jti`
   - Should create a NEW login audit entry
   - `last_login` should update

## Files Modified

### Database Migrations
- `V5__add_user_roles_auditing.sql` (NEW)
- `V6__add_token_jti_to_login_audit.sql` (NEW)

### Backend Java
- `UserRole.java` - Updated to use JPA auditing
- `LoginAudit.java` - Added `tokenJti` field
- `LoginAuditRepository.java` - Added `existsByTokenJti()`
- `UserRoleRepository.java` - Updated queries
- `JpaAuditingConfig.java` (NEW) - AuditorAware configuration
- `AuthApplication.java` - Removed redundant `@EnableJpaAuditing`
- `SessionService.java` (NEW) - Idempotent login tracking
- `SessionController.java` (NEW) - Mark-login endpoint
- `UserService.java` - Removed login audit from getCurrentUserProfile

### Frontend
- `Callback.tsx` - Added mark-login call after OAuth flow

## Benefits

### A) User Roles Auditing
✅ Automatic audit trail of who assigned roles  
✅ Built into JPA framework (no manual coding)  
✅ Consistently populated across all role assignments  
✅ FK constraint ensures data integrity  
✅ Queryable for compliance/reporting  

### B) Idempotent Login Tracking
✅ Accurate login counts (one per session, not per page view)  
✅ Correct `last_login` timestamps  
✅ Reduced database bloat (no duplicate entries)  
✅ JTI-based deduplication at the database level  
✅ Handles browser refresh and navigation gracefully  

## Security Considerations

1. **AuditorAware** extracts user from SecurityContext, which is populated by the JWT converter
2. If `AuditorAware` fails or returns empty, `assigned_by` will be `NULL` (but assignment still succeeds)
3. JTI uniqueness constraint prevents duplicate login tracking even under race conditions
4. Session endpoint requires authentication (users must be logged in to mark themselves)

## Troubleshooting

### Issue: `assigned_by` is always NULL
**Solution**: Check that JPA Auditing is enabled and `JpaAuditingConfig` is loaded. Verify `AuditorAware` is returning user IDs correctly.

### Issue: Duplicate login entries
**Solution**: Verify that frontend is calling `/api/v1/sessions/mark-login` only once after login. Check database for unique constraint on `token_jti`.

### Issue: JTI is null in database
**Solution**: Check if Cognito is providing `jti` claim in tokens. The service has a fallback to `sub + iat` if `jti` is missing.

### Issue: Migration fails
**Solution**: Check if columns already exist. Migrations use `IF NOT EXISTS` checks, but verify Flyway hasn't marked them as run previously.

