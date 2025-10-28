# Mobile Login Audit Fix

## Problem

Mobile app profile updates were working, but login audit events were not appearing in the database. This was because the mobile app was never calling the `POST /api/v1/sessions/mark-login` endpoint.

## Solution

Implemented end-to-end login tracking for the mobile app with proper idempotency handling.

## Changes Made

### 1. Frontend (Flutter Mobile App)

#### A) Added mark-login API call
**File: `mobile-app/lib/src/api_client.dart`**

Added new method:
```dart
Future<void> markLoginOnce() async {
  final token = await AuthService.instance.getAccessToken();
  if (token == null || token.isEmpty) {
    developer.log('mark-login skipped: no access token');
    return;
  }

  final r = await http.post(
    Uri.parse('${ApiBase.base}/api/v1/sessions/mark-login'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: json.encode({}),
  );
  
  developer.log('mark-login status=${r.statusCode}');
}
```

#### B) Updated API base URL handling
**File: `mobile-app/lib/src/api_base.dart`**

Now properly handles different environments:
- **Android Emulator**: Uses `http://10.0.2.2:8080` to access host machine
- **iOS Simulator**: Uses `http://localhost:8080`
- **Web**: Uses `http://localhost:8080`

```dart
static String get base {
  if (kIsWeb) {
    return 'http://localhost:8080';
  }
  
  if (Platform.isAndroid) {
    return 'http://10.0.2.2:8080';  // Android emulator
  }
  
  return 'http://localhost:8080';   // iOS simulator
}
```

#### C) Integrated mark-login in auth flow
**File: `mobile-app/lib/main.dart`**

Added logic to call mark-login once after successful sign-in:

```dart
class _AuthGateState extends State<AuthGate> {
  bool _hasMarkedLogin = false;

  Future<void> _load() async {
    try {
      final previousUser = user;
      user = await Amplify.Auth.getCurrentUser();
      
      // If user just signed in, mark login once
      if (previousUser == null && user != null && !_hasMarkedLogin) {
        await _markLoginOnce();
        _hasMarkedLogin = true;
      }
    } catch (_) {
      user = null;
    }
  }
}
```

#### D) Android cleartext permission
**File: `mobile-app/android/app/src/main/AndroidManifest.xml`**

Added `android:usesCleartextTraffic="true"` to allow HTTP traffic in development:

```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

### 2. Backend Changes

#### A) JTI hash fallback for idempotency
**File: `auth-backend/src/main/java/com/itcenter/auth/service/SessionService.java`**

Updated to handle tokens without `jti` claim by hashing the token:

```java
if (jti == null || jti.isBlank()) {
    try {
        String tokenValue = jwt.getTokenValue();
        jti = org.apache.commons.codec.digest.DigestUtils.sha256Hex(tokenValue);
        log.debug("No JTI claim found, using SHA256 hash of token");
    } catch (Exception e) {
        // Final fallback: use sub + iat
        String sub = jwt.getClaimAsString("sub");
        jti = sub + "_" + jwt.getIssuedAt();
    }
}
```

#### B) Added Apache Commons Codec dependency
**File: `auth-backend/pom.xml`**

```xml
<dependency>
    <groupId>commons-codec</groupId>
    <artifactId>commons-codec</artifactId>
    <version>1.16.0</version.abs>
</dependency>
```

## How It Works

### Flow Diagram

1. **User signs in** via Cognito Hosted UI
2. **AuthGate detects** new user session (previousUser was null, now has user)
3. **Calls mark-login** once via `ApiClient.markLoginOnce()`
4. **Backend receives** POST request with access token
5. **Extracts JTI** from JWT (or hashes token if JTI missing)
6. **Checks database** if this JTI was already recorded
7. **If not recorded:**
   - Creates LoginAudit entry with event_type='LOGIN_SUCCESS'
   - Updates app_users.last_login timestamp
   - Stores token_jti for future idempotency checks
8. **If already recorded:** Does nothing (idempotent)

### Idempotency Guarantee

The system ensures **one login audit entry per JWT token** through:

1. **JTI-based deduplication**: Each JWT has a unique `jti` (JWT ID)
2. **Database constraint**: Unique index on `token_jti` prevents duplicates
3. **Hash fallback**: If `jti` is missing, SHA256 hash of token is used
4. **Query check**: `existsByTokenJti()` prevents duplicate inserts

### Page Refresh Handling

When the user refreshes or navigates:
- `_hasMarkedLogin` flag remains `true` for the session
- No additional mark-login calls are made
- Only one audit entry per login session

When the user signs out and signs in again:
- `_hasMarkedLogin` is reset to `false`
- New JWT with different `jti` is issued
- New login audit entry is created

## Testing

### Verify Login Audit in Database

```sql
-- Check recent login events
SELECT 
    la.id,
    la.event_type,
    la.created_at,
    la.token_jti,
    u.email
FROM login_audit la
JOIN app_users u ON la.user_id = u.id
WHERE la.event_type = 'LOGIN_SUCCESS'
ORDER BY la.created_at DESC
LIMIT 10;

-- Verify one entry per token JTI
SELECT token_jti, COUNT(*) as count
FROM login_audit
WHERE event_type = 'LOGIN_SUCCESS'
AND token_jti IS NOT NULL
GROUP BY token_jti
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

### Test Mobile Flow

1. **Open mobile app**
2. **Sign in** via Hosted UI
3. **Watch logs** for: `mark-login status=204`
4. **Navigate/refresh** multiple times
5. **Verify**: Only ONE login audit entry exists
6. **Sign out** and **sign in again**
7. **Verify**: NEW login audit entry with different JTI

### Expected Log Output

**Mobile app logs:**
```
mark-login status=204 body=
```

**Backend logs:**
```
Login marked for user: user@example.com, JTI: abc123...
```

## Common Issues and Solutions

### Issue: "mark-login skipped: no access token"
**Cause**: Mobile app couldn't get access token from Amplify session  
**Solution**: 
- Verify Amplify is properly configured
- Check that user completed sign-in successfully
- Ensure `amplifyconfiguration.dart` is correct

### Issue: Connection refused / timeout
**Cause**: Using wrong base URL for platform  
**Solution**:
- Android emulator: Ensure using `10.0.2.2:8080`
- iOS simulator: Ensure using `localhost:8080`
- Physical device: Use your PC's LAN IP instead of localhost

### Issue: Duplicate login entries
**Cause**: `_hasMarkedLogin` flag not working properly  
**Solution**:
- Check that sign-out resets the flag
- Verify no multiple calls to `markLoginOnce()`

### Issue: JTI collision (unique constraint violation)
**Cause**: Token hash collision (extremely rare)  
**Solution**:
- Backend UIKit fallback to sub+iat
- No action needed - rare edge case

## Security Considerations

### Cleartext Traffic
- ⚠️ `usesCleartextTraffic="true"` allows HTTP
- ✅ **Only for development** - remove in production
- ✅ Use HTTPS in production deployments

### Token Handling
- ✅ Access token sent in Authorization header
- ✅ Token validated by Spring Security
- ✅ JTI stored in database for idempotency
- ✅ No sensitive data in audit log

### Mobile Client IDs
Ensure backend security configuration accepts both web and mobile client IDs:

```yaml
# application.yml
app:
  security:
    accepted-audiences: webClientId,mobileClientId
```

## Files Modified

### Mobile App (Flutter)
- `lib/src/api_client.dart` - Added mark-login method
- `lib/src/api_base.dart` - Platform-specific URL handling
- `lib/main.dart` - Auth flow integration
- `android/app/src/main/AndroidManifest.xml` - Cleartext permission

### Backend (Spring Boot)
- `src/main/java/com/itcenter/auth/service/SessionService.java` - JTI hash fallback
- `pom.xml` - Added Commons Codec dependency

## Summary

The mobile app now properly records login events in the database with full idempotency support. Each login session creates exactly one audit entry, regardless of page refreshes or navigation. The system uses JWT token IDs (or SHA256 hashes as fallback) to ensure uniqueness and prevent duplicate entries.

