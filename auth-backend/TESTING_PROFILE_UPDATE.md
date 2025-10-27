# Testing Profile Update - Complete Guide

## Current Implementation Analysis

### ✅ Backend Already Correct

**Controller** (`UserController.java`):
```java
@PatchMapping("/me")
public ResponseEntity<UserProfileResponse> updateCurrentUser(
        @Valid @RequestBody UpdateProfileRequest request) {
    return ResponseEntity.ok(userService.updateCurrentUserProfile(request));
}
```

**Service** (`UserService.java`):
```java
@Transactional  // ✅ Present
public UserProfileResponse updateCurrentUserProfile(UpdateProfileRequest request) {
    // Load user
    AppUser user = provisioningService.findOrCreateFromJwt(jwt);
    
    // Update fields
    if (request.getDisplayName() != null && !request.getDisplayName().trim().isEmpty()) {
        String newDisplayName = request.getDisplayName().trim();
        if (!newDisplayName.equals(user.getDisplayName())) {
            user.setDisplayName(newDisplayName);
            changed = true;
        }
    }
    
    if (request.getLocale() != null && !request.getLocale().trim().isEmpty()) {
        String newLocale = request.getLocale().trim();
        if (!newLocale.equals(user.getLocale())) {
            user.setLocale(newLocale);
            changed = true;
        }
    }
    
    // ✅ SAVE TO DATABASE
    if (changed) {
        user = userRepository.saveAndFlush(user);
    }
    
    return mapToProfileResponse(user);
}
```

### ✅ DTO Fixed
```java
@Data
public class UpdateProfileRequest {
    private String displayName;  // ✅ camelCase (matches JSON)
    private String locale;       // ✅ matches JSON
}
```

---

## What Changed

### 1. Added Enhanced Logging

The service now logs:
- Request received with values
- Current values from database
- Changes detected (if any)
- Save operation execution
- Final saved values

### 2. Change Detection

Only saves if values actually changed:
```java
boolean changed = false;

if (newDisplayName != currentDisplayName) {
    user.setDisplayName(newDisplayName);
    changed = true;
}

if (changed) {
    userRepository.saveAndFlush(user);  // Only if changed
}
```

### 3. Flutter Logging

API client logs:
- Request URL
- Headers (including Authorization)
- Request body (JSON)
- Response status
- Response body

---

## How to Test

### Step 1: Start Backend

```bash
cd auth-backend
./start.bat
```

Watch the logs - you should see detailed SQL output.

### Step 2: Run Flutter

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

**Flutter Console:**
```
[PATCH /me] URL: http://localhost:8080/api/v1/me
[PATCH /me] headers: {Authorization: Bearer eyJ..., Content-Type: application/json}
[PATCH /me] body: {"displayName":"Test User","locale":"si"}
[PATCH /me] status: 200
[PATCH /me] response body: {"id":123,"email":"...","displayName":"Test User","locale":"si",...}
```

**Backend Logs:**
```
UpdateProfileRequest received - displayName: 'Test User', locale: 'si'
Updating profile for user ID: 123, current displayName: 'Old Name', current locale: 'en'
Changing displayName from 'Old Name' to 'Test User'
Changing locale from 'en' to 'si'
Changes detected, saving user to database...
Hibernate: update app_users set display_name=?, locale=?, updated_at=? where id=?
User saved successfully. ID: 123, displayName: 'Test User', locale: 'si'
```

---

## Backend Verification

### Entity Fields ✅

```java
@Entity
@Table(name = "app_users")
public class AppUser {
    @Column(name = "display_name", length = 50)
    private String displayName;
    
    @Column(length = 10)
    private String locale;
    
    @UpdateTimestamp  // ✅ Auto-updated
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### Repository ✅

```java
@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    Optional<AppUser> findByCognitoSub(String cognitoSub);
}
```

---

## Common Issues & Fixes

### Issue: "No changes detected"

**Cause:** Values match current values in DB  
**Check:** Look at logs to see current vs new values

### Issue: "UpdateProfileRequest received - null, null"

**Cause:** Request body not binding correctly  
**Fix:** Check DTO field names match JSON

### Issue: SQL shows "where id=?" but no UPDATE

**Cause:** Values match, no changes detected  
**Fix:** Change to different values

---

## Manual Database Check

### Connect to PostgreSQL

```bash
psql -h localhost -U itcenter -d itcenter_auth
```

### Check User Table

```sql
SELECT id, email, display_name, locale, updated_at 
FROM app_users 
ORDER BY updated_at DESC;
```

### Verify Update

Look for:
- `display_name` matches your update
- `locale` matches your update
- `updated_at` timestamp changed

---

## Expected Flow

1. User clicks "Save" in Flutter
2. PATCH request sent to `/api/v1/me`
3. Backend receives request
4. Backend loads user from DB
5. Backend compares values
6. **If changed:** Saves to DB with `saveAndFlush()`
7. Backend returns updated user
8. Flutter shows success message
9. Database updated ✅

---

## Ready to Test! 🚀

With enhanced logging, you'll see exactly:
- What values are sent
- What values are in the database
- Whether a change was detected
- Whether the save was executed
- What SQL was run

Test now and check the logs!

