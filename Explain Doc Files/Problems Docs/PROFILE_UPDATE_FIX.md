# Profile Update End-to-End Fix

## Issues Found and Fixed

### 1. **Frontend: Field Name Mismatch (CRITICAL)**
**Problem**: Frontend was sending `display_name` (snake_case) but backend expects `displayName` (camelCase). This caused all profile updates to fail silently as the fields were null.

**Fix**: Updated `Profile.tsx` to send `displayName` and `locale` in camelCase format matching the backend DTO.

**Changes in `admin-web/src/pages/Profile.tsx`:**
- Changed mutation payload from `display_name` to `displayName`
- Added proper synchronization of form state with fetched user data using `useEffect`
- Added error handling in mutation to show proper error messages
- Added loading state to improve UX
- Updated max length from 50 to 80 characters to match backend validation

### 2. **Backend: Missing Validation Annotations**
**Problem**: The `UpdateProfileRequest` DTO had no validation constraints, making it vulnerable to invalid input.

**Fix**: Added proper validation annotations:
- `@Size(max = 80)` for displayName
- `@Pattern` for locale to enforce proper format

**Changes in `auth-backend/src/main/java/com/itcenter/auth/dto/UpdateProfileRequest.java`:**
```java
@Size(max = 80, message = "Display name must not exceed 80 characters")
private String displayName;

@Pattern(regexp = "^[a-z]{2,3}(-[A-Z]{2,4})?(-[A-Z0-9]+)?$", 
         message = "Locale must be in format like 'en', 'en-US', 'en-GB', etc.")
private String locale;
```

### 3. **Backend: Improved Audit Logging**
**Problem**: Profile update audit events weren't capturing IP address and user agent.

**Fix**: Updated the audit logging in `UserService.updateCurrentUserProfile()` to capture request metadata.

**Changes in `auth-backend/src/main/java/com/itcenter/auth/service/UserService.java`:**
- Changed from `auditService.logEvent(user.getId(), ...)` to `auditService.logEvent(user, ...)`
- Added IP address and user agent extraction from HttpServletRequest
- Improved error handling to not fail the update if audit logging fails

## Testing the Profile Update Functionality

### Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`
- User logged in with valid Cognito authentication

### Step 1: Smoke Test the API Directly

Use curl or Postman to test the PATCH endpoint:

```bash
curl -i -X PATCH http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test User","locale":"en-US"}'
```

**Expected Response:**
- Status: `200 OK`
- Body: JSON with updated user profile including the new displayName and locale

**Verify in Database:**
```sql
SELECT id, email, display_name, locale, updated_at 
FROM app_users 
WHERE email = 'your-email@test.com';
```

### Step 2: Test via Frontend

1. Navigate to Profile page (`http://localhost:5173/profile`)
2. Update the Display Name field (e.g., "John Doe")
3. Select a different Locale (e.g., "English (UK)")
4. Click "Save Changes"
5. Verify:
   - Success message appears: "Profile updated successfully"
   - The page refreshes showing the new values
   - The updated data persists after page refresh

### Step 3: Verify Audit Logging

Check that audit events are being logged:

```sql
SELECT * FROM login_audit 
WHERE event_type = 'PROFILE_UPDATED' 
ORDER BY created_at DESC 
LIMIT 10;
```

You should see entries with:
- `event_type`: 'PROFILE_UPDATED'
- `ip_address`: Your IP address
- `user_agent`: Your browser's user agent
- `user_id`: Your user ID

### Step 4: Test Error Handling

#### Invalid Display Name
1. Try to update with display name longer than 80 characters
2. **Expected**: Validation error message displayed

#### Invalid Locale Format
1. Try to update with locale "invalid-format-123"
2. **Expected**: Validation error message displayed

#### Network Error
1. Stop the backend server
2. Try to update profile
3. **Expected**: Error message displayed to user

## Architecture Verification

### Security Configuration ✅
The `SecurityConfig` properly allows PATCH requests:
- CORS configured for `http://localhost:5173`
- PATCH method allowed
- `/api/v1/me` endpoint requires authentication
- CSRF disabled for SPA (using JWT tokens)

### Transaction Management ✅
The `updateCurrentUserProfile()` method has:
- `@Transactional` annotation ensuring ACID compliance
- `saveAndFlush()` to force immediate persistence
- Proper error handling that doesn't leave partial updates

### Entity Mapping ✅
The `AppUser` entity correctly maps to database columns:
- `displayName` → `display_name` (via `@Column(name="display_name")`)
- `locale` → `locale` (direct mapping)
- `@UpdateTimestamp` ensures `updated_at` is automatically updated

### Frontend State Management ✅
- Uses React Query for server state
- Properly invalidates queries after successful mutation
- Local state synchronized with server data via useEffect
- Loading and error states handled appropriately

## Common Issues and Solutions

### Issue: Changes show in UI but not in DB
**Solution**: 
- Check backend logs for any SQL errors
- Verify the user is authenticated (token in localStorage)
- Check database connection is active
- Look for transaction rollbacks in logs

### Issue: "Invalid authentication principal" error
**Solution**:
- Ensure JWT token is valid and not expired
- Check that token has required claims
- Verify JwtAuthConverter is properly configured

### Issue: CORS errors
**Solution**:
- Verify `app.cors-allowed-origins` in application.yml includes frontend URL
- Check SecurityConfig has CORS properly configured
- Ensure preflight OPTIONS requests are handled

### Issue: Validation errors not shown
**Solution**:
- Check GlobalExceptionHandler has MethodArgumentNotValidException handler
- Verify DTO has proper validation annotations
- Check that @Valid is present on controller parameter

## Files Modified

### Frontend
- `admin-web/src/pages/Profile.tsx`

### Backend
- `auth-backend/src/main/java/com/itcenter/auth/dto/UpdateProfileRequest.java`
- `auth-backend/src/main/java/com/itcenter/auth/service/UserService.java`
- `auth-backend/src/main/java/com/itcenter/auth/controller/UserController.java`

## Summary

The profile update functionality is now properly implemented with:
✅ Correct field name mapping (camelCase)
✅ Proper validation on both frontend and backend
✅ Comprehensive error handling
✅ Audit logging with request metadata
✅ Transaction management for data consistency
✅ Loading and error states in UI
✅ Auto-refresh of data after successful update

