# Troubleshooting: User Not Created in Database

## Problem
After login, user is not created in Phase 1 database (`app_users` table) and profile shows no details.

## Step-by-Step Debugging

### 1. Check if Phase 1 Backend is Running

**Check if backend is running:**
```bash
# Check if port 8080 is in use
netstat -ano | findstr :8080
# Or
Get-NetTCPConnection -LocalPort 8080
```

**Start Phase 1 backend if not running:**
```bash
cd auth-backend
# Windows
.\mvnw.cmd spring-boot:run
# Or
.\start.ps1
```

### 2. Check Browser Console

Open browser Developer Tools (F12) and check Console tab:

**Look for errors like:**
- `Failed to fetch user details`
- `Network Error`
- `CORS error`
- `401 Unauthorized`
- `500 Internal Server Error`

**Check Network tab:**
- Look for request to `http://localhost:8080/api/v1/me`
- Check if request is being made
- Check response status code
- Check response body

### 3. Check Phase 1 Backend Logs

**Look for:**
- `Creating new user via JIT provisioning`
- `Created user with ID: X for email: Y`
- Any database connection errors
- Any JWT validation errors

**Common errors:**
```
Failed to sync new user to Phase 2
Database connection error
JWT validation failed
```

### 4. Verify API Base URL

**Check environment variable:**
```bash
# In admin-web directory
# Check if .env file exists
# Or check VITE_API_BASE_URL
```

**Default is:** `http://localhost:8080`

**If backend is on different host/port, create `.env` file:**
```bash
# admin-web/.env
VITE_API_BASE_URL=http://your-backend-host:8080
```

### 5. Test API Manually

**Test if backend is accessible:**
```bash
# Test health endpoint
curl http://localhost:8080/actuator/health

# Test with token (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/me
```

### 6. Check Database Connection

**Verify Phase 1 can connect to database:**
```bash
# Check application.yml
# Verify database connection settings:
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/itcenter_auth
    username: itcenter
    password: password
```

**Test database connection:**
```sql
-- In pgAdmin or psql
SELECT * FROM app_users LIMIT 5;
```

### 7. Check JWT Token

**Verify token is being sent:**
- Open browser DevTools → Network tab
- Find request to `/api/v1/me`
- Check Request Headers
- Should have: `Authorization: Bearer <token>`

**Decode JWT token (for debugging):**
- Go to https://jwt.io
- Paste the `id_token` from localStorage
- Check if it has `sub`, `email`, `name` claims

### 8. Common Issues & Fixes

#### Issue: Backend not running
**Fix:** Start Phase 1 backend
```bash
cd auth-backend
.\mvnw.cmd spring-boot:run
```

#### Issue: CORS error
**Fix:** Check `application.yml` CORS settings
```yaml
app:
  cors-allowed-origins: http://localhost:5173,http://127.0.0.1:5173
```

#### Issue: Database connection error
**Fix:** 
- Check database is running
- Verify connection string in `application.yml`
- Check database credentials

#### Issue: JWT validation error
**Fix:**
- Check Cognito configuration in `application.yml`
- Verify `COGNITO_ISSUER_URI` is correct
- Check token hasn't expired

#### Issue: API call failing silently
**Fix:** Check browser console for errors
- The error might be caught and logged but not shown to user

### 9. Enable Debug Logging

**Add to `application.yml`:**
```yaml
logging:
  level:
    com.itcenter.auth: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
```

**Restart backend and check logs for:**
- JWT processing
- User creation attempts
- Database operations

### 10. Manual User Creation Test

**Test user creation directly:**
```bash
# Use Postman or curl to call /api/v1/me with valid JWT token
curl -X GET \
  http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Check database after:**
```sql
SELECT * FROM app_users ORDER BY created_at DESC LIMIT 1;
```

## Quick Checklist

- [ ] Phase 1 backend is running on port 8080
- [ ] Database is running and accessible
- [ ] Browser console shows no errors
- [ ] Network tab shows `/api/v1/me` request
- [ ] Request has `Authorization: Bearer <token>` header
- [ ] Backend logs show user creation attempt
- [ ] No CORS errors
- [ ] JWT token is valid and not expired

## Expected Flow

1. User logs in → Gets tokens from Cognito
2. Web app calls `/api/v1/me` with access token
3. Phase 1 backend validates JWT
4. Backend calls `findOrCreateFromJwt()`
5. User created in `app_users` table
6. Response sent back to web app
7. Profile page shows user details

## If Still Not Working

1. **Check backend logs** - Look for errors
2. **Check database** - Verify user table exists
3. **Test with Postman** - Bypass web app
4. **Check JWT claims** - Verify token has required fields
5. **Verify database permissions** - User can INSERT into `app_users`

