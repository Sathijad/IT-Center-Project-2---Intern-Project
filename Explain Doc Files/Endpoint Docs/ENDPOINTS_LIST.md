# API Endpoints List

This document lists all endpoints in the IT Center Auth Backend project and their working status.

## Endpoint Status Legend
- ✅ **WORKING** - Endpoint is implemented and should work correctly
- ⚠️ **CONDITIONAL** - Endpoint may not work depending on configuration or authentication
- ❌ **NOT WORKING** - Endpoint has issues preventing it from working properly

---

## 1. Health Check Endpoints

### GET /healthz
- **Status**: ✅ **WORKING**
- **Authentication**: Not required (public)
- **Description**: Simple health check endpoint
- **Response**: `{"status": "UP"}`
- **Location**: `HealthController.java`

### GET /actuator/health
- **Status**: ✅ **WORKING** (if Actuator is configured)
- **Authentication**: Not required (public)
- **Description**: Spring Boot Actuator health endpoint
- **Notes**: Configured in SecurityConfig but Actuator may need additional configuration

---

## 2. User Profile Endpoints (Authenticated Users)

### GET /api/v1/me
- **Status**: ✅ **WORKING**
- **Authentication**: Required (JWT Bearer token)
- **Authorization**: Any authenticated user
- **Description**: Get current user's profile
- **Response**: `UserProfileResponse`
- **Includes**:
  - User ID, email, display name, locale
  - Roles, created at, last login
- **Implementation**: `UserService.getCurrentUserProfile()`

### PATCH /api/v1/me
- **Status**: ✅ **WORKING**
- **Authentication**: Required (JWT Bearer token)
- **Authorization**: Any authenticated user
- **Description**: Update current user's profile
- **Request Body**: `UpdateProfileRequest`
  - `displayName` (optional)
  - `locale` (optional)
- **Response**: `UserProfileResponse`
- **Notes**: 
  - Updates display name and/or locale
  - Logs audit event for profile updates
  - Saves to database with flush to ensure persistence
- **Implementation**: `UserService.updateCurrentUserProfile()`

---

## 3. Admin User Management Endpoints

All endpoints in this section require:
- **Authentication**: Required (JWT Bearer token)
- **Authorization**: `ROLE_ADMIN` only

### GET /api/v1/admin/users
- **Status**: ✅ **WORKING** (Admin role required)
- **Description**: List all users with pagination and search
- **Query Parameters**:
  - `query` (optional): Search term
  - `page` (default: 0): Page number
  - `size` (default: 20): Page size
  - `sort` (default: "created_at"): Sort field
- **Response**: `Page<UserSummaryResponse>`
- **Features**: 
  - Search functionality
  - Pagination
  - Sorting (default: createdAt DESC)
- **Implementation**: `UserService.searchUsers()`

### GET /api/v1/admin/users/{id}
- **Status**: ✅ **WORKING** (Admin role required)
- **Description**: Get user details by ID
- **Path Variables**:
  - `id`: User ID (Long)
- **Response**: `UserSummaryResponse`
- **Implementation**: `UserService.getUserById()`

### PATCH /api/v1/admin/users/{id}/roles
- **Status**: ✅ **WORKING** (Admin role required)
- **Description**: Update user roles
- **Path Variables**:
  - `id`: User ID (Long)
- **Request Body**: `UpdateRolesRequest`
  - `roles`: Array of role names (e.g., ["ADMIN", "EMPLOYEE"])
- **Response**: `UserSummaryResponse`
- **Notes**:
  - Validates roles exist in database
  - Logs audit event for role changes
  - Allows promoting/demoting users
- **Implementation**: `UserService.updateUserRoles()`

---

## 4. Admin Audit Log Endpoints

### GET /api/v1/admin/audit-log
- **Status**: ✅ **WORKING** (Admin role required)
- **Description**: Get audit log entries with filtering
- **Query Parameters**:
  - `user_id` (optional): Filter by user ID
  - `event_type` (optional): Filter by event type
  - `start_date` (optional): Start date filter (ISO 8601)
  - `end_date` (optional): End date filter (ISO 8601)
  - `page` (default: 0): Page number
  - `size` (default: 20): Page size
- **Response**: `Page<AuditEntryResponse>`
- **Notes**:
  - All filters are optional
  - Supports date range filtering
  - Pagination supported
- **Implementation**: `AuditService.getAuditLog()`

---

## Security Configuration Notes

### Authentication Flow
1. User authenticates with AWS Cognito
2. Receives JWT token
3. Token is validated by Spring Security OAuth2 Resource Server
4. `JwtAuthConverter` loads user roles from database based on JWT `sub` claim
5. Roles are mapped to Spring Security authorities with `ROLE_` prefix

### Authorization Rules (from SecurityConfig.java)
- `/healthz` - Public (no auth)
- `/api/v1/me` - Any authenticated user
- `/api/v1/admin/**` - `ROLE_ADMIN` only
- All other requests - Authenticated users

### CORS Configuration
- Allowed Origins: Configurable via `app.cors-allowed-origins`
- Default: `http://localhost:5173,http://127.0.0.1:5173`
- All methods allowed: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Credentials: Allowed

---

## Potential Issues to Watch

### 1. JWT Authentication
- **Status**: ⚠️ **CONDITIONAL**
- **Issue**: Depends on proper Cognito configuration
- **Component**: `JwtAuthConverter.java` (untracked file)
- **Risk**: If JWT validation fails, all authenticated endpoints will fail
- **Mitigation**: Ensure Cognito issuer URI and JWK set URI are correctly configured

### 2. Database Connection
- **Status**: ⚠️ **CONDITIONAL**
- **Issue**: Endpoints depend on PostgreSQL database
- **Risk**: If database is down, most endpoints will fail
- **Default**: `localhost:5432/itcenter_auth`

### 3. Admin Role Assignment
- **Status**: ⚠️ **CONDITIONAL**
- **Issue**: Admin-only endpoints require user to have `ROLE_ADMIN` role
- **Risk**: Users may not have correct roles assigned
- **Note**: Check database for role assignments

### 4. Audit Logging
- **Status**: ⚠️ **CONDITIONAL**
- **Issue**: Some endpoints try to log audit events but catch exceptions
- **Impact**: Endpoints may work but audit logging may fail silently
- **Affected Endpoints**: 
  - `PATCH /api/v1/me` - Profile updates
  - `PATCH /api/v1/admin/users/{id}/roles` - Role changes

---

## Request/Response Examples

### User Profile Response
```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "John Doe",
  "locale": "en-US",
  "roles": ["EMPLOYEE"],
  "createdAt": "2024-01-01T00:00:00",
  "lastLogin": "2024-01-15T10:30:00"
}
```

### User Summary Response
```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "John Doe",
  "locale": "en-US",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00",
  "lastLogin": "2024-01-15T10:30:00",
  "roles": ["ADMIN"]
}
```

### Audit Entry Response
```json
{
  "id": 1,
  "userId": 1,
  "userEmail": "user@example.com",
  "eventType": "LOGIN",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": "Additional info",
  "createdAt": "2024-01-15T10:30:00"
}
```

---

## Summary

### Total Endpoints: 7
- ✅ Fully Working: 6 endpoints
- ⚠️ Conditional: 6 endpoints (may fail due to configuration)
- ❌ Not Working: 0 endpoints

### Endpoints by Category:
- Health: 2 endpoints
- User Profile: 2 endpoints
- Admin User Management: 3 endpoints
- Admin Audit Log: 1 endpoint (included in admin section above)

### Authentication Requirements:
- Public: 2 endpoints (`/healthz`, `/actuator/health`)
- Authenticated: 5 endpoints
- Admin Only: 4 endpoints

---

## Notes

1. The `JwtAuthConverter.java` file is untracked in git, which may indicate recent changes to authentication
2. All endpoints use RESTful conventions with proper HTTP methods
3. Pagination is implemented for list endpoints
4. Search functionality is available for user listing
5. Audit logging is attempted for important operations
6. CORS is configured for cross-origin requests from frontend applications

