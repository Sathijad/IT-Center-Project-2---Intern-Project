# Profile Update Debug Guide

## What Was Fixed

### 1. ✅ API Client Logging Added
**File:** `mobile-app/lib/src/api_client.dart`

Added debug logging to see exactly what's being sent:
```
[PATCH /me] URL: http://localhost:8080/api/v1/me
[PATCH /me] headers: {Authorization: Bearer xxx, Content-Type: application/json}
[PATCH /me] body: {"displayName":"Test User","locale":"en"}
[PATCH /me] status: 200
[PATCH /me] response body: {...}
```

### 2. ✅ Backend DTO Fixed
**File:** `auth-backend/src/main/java/com/itcenter/auth/dto/UpdateProfileRequest.java`

**Before:**
```java
@JsonProperty("display_name")  // Wrong - snake_case
private String displayName;
```

**After:**
```java
private String displayName;  // Correct - camelCase
```

### 3. ✅ SQL Logging Enhanced
**File:** `auth-backend/src/main/resources/application-dev.yml`

Added:
```yaml
logging:
  level:
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
    
spring:
  jpa:
    properties:
      hibernate:
        format_sql: true
```

---

## How to Test

### Step 1: Start Backend with Logging
```bash
cd auth-backend
./start.bat
```

Watch the logs - you should see SQL statements when you update the profile.

### Step 2: Run Flutter App
```bash
cd mobile-app
flutter run -d chrome --web-port 56956
```

### Step 3: Test Profile Update
1. Sign in
2. Click "Edit Profile"
3. Change display name to "Test User"
4. Change locale to "si"
5. Click "Save"

### Step 4: Check Logs

**Flutter Console (should show):**
```
[PATCH /me] URL: http://localhost:8080/api/v1/me
[PATCH /me] headers: {Authorization: Bearer xxx, Content-Type: application/json}
[PATCH /me] body: {"displayName":"Test User","locale":"si"}
[PATCH /me] status: 200
```

**Backend Logs (should show):**
```
Updating profile for user ID: 123, current displayName: Old Name, current locale: en
Setting displayName from 'Old Name' to 'Test User'
Setting locale from 'en' to 'si'
Saved user with ID: 123, new displayName: Test User, new locale: si
Hibernate: update app_users set display_name=?, locale=? where id=?
```

---

## Manual Testing with curl

### Get Access Token
After signing in via Flutter, open browser console and get the token from Network tab.

### Test PATCH
```bash
curl -i -X PATCH http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test User","locale":"en"}'
```

**Expected Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "displayName": "Test User",
  "locale": "en",
  "roles": ["EMPLOYEE"]
}
```

### Verify with GET
```bash
curl http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Should show updated values.

---

## Common Issues

### 1. Field Name Mismatch
**Problem:** `display_name` vs `displayName`  
**Fix:** ✅ Already fixed - removed @JsonProperty

### 2. Not Saving
**Problem:** Changes show in UI but don't persist  
**Fix:** ✅ Using `saveAndFlush()` in backend

### 3. CORS Errors
**Problem:** Browser blocks PATCH request  
**Fix:** ✅ CORS configured in SecurityConfig

### 4. Empty Request Body
**Problem:** `{}` sent instead of values  
**Check:** Look at Flutter console logs to verify JSON

---

## Backend Implementation (Verified)

### Controller
```java
@PatchMapping("/me")
public ResponseEntity<UserProfileResponse> updateCurrentUser(
        @Valid @RequestBody UpdateProfileRequest request) {
    return ResponseEntity.ok(userService.updateCurrentUserProfile(request));
}
```

### Service (Saves to DB)
```java
@Transactional  // Not readOnly!
public UserProfileResponse updateCurrentUserProfile(UpdateProfileRequest request) {
    // Load user
    AppUser user = provisioningService.findOrCreateFromJwt(jwt);
    
    // Update fields
    if (request.getDisplayName() != null) {
        user.setDisplayName(request.getDisplayName());
    }
    if (request.getLocale() != null) {
        user.setLocale(request.getLocale());
    }
    
    // PERSIST TO DATABASE
    user = userRepository.saveAndFlush(user);
    
    return mapToProfileResponse(user);
}
```

---

## Ready to Test! 🚀

With these fixes:
- ✅ API client logs everything
- ✅ Backend DTO matches JSON field names
- ✅ SQL logging shows database writes
- ✅ Backend uses saveAndFlush() to persist

Try updating your profile and check the logs!

