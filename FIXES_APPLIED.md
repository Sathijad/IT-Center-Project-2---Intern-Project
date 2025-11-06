# Fixes Applied for 500 Errors

## Issues Found & Fixed

### 1. ✅ Missing `userId` in Authentication Middleware
**Problem**: The `authenticate` middleware was not fetching `userId` from the database, causing `req.user.userId` to be `undefined`.

**Fix**: Updated `leave-attendance-backend/src/middleware/auth.js` to:
- Fetch `userId` from database using `getUserIdFromCognitoSub()`
- Fetch user roles from database
- Set both `req.user.userId` and `req.user.roles` in the authenticate middleware

### 2. ✅ SQL Injection Prevention
**Problem**: Sort fields were being directly inserted into SQL queries without validation.

**Fix**: Added validation for sort fields:
- `leaveRepository.js`: Only allows `['created_at', 'updated_at', 'start_date', 'end_date', 'status']`
- `attendanceRepository.js`: Only allows `['clock_in', 'clock_out', 'created_at']`

### 3. ✅ Count Query Regex Issues
**Problem**: Regex for removing ORDER BY and LIMIT from count queries was not working correctly.

**Fix**: Improved regex patterns to properly extract count queries.

### 4. ✅ Error Handling
**Problem**: Errors were not being logged properly, making debugging difficult.

**Fix**: 
- Added error logging in `errorHandler.js`
- Added try-catch blocks in route handlers
- Added validation for undefined `userId`

### 5. ✅ Database Connection Password Issue
**Problem**: Database connection was failing with "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" error. The `.env` file was not being loaded, and the connection string parsing was not handling the password correctly.

**Fix**: 
- Installed `dotenv` package to load `.env` file
- Added `import 'dotenv/config'` at the top of `server.js` to load environment variables
- Changed database configuration to parse `DATABASE_URL` and use individual connection parameters instead of `connectionString`
- Ensured password is always a string (defaults to empty string if undefined)
- Added validation and error messages for missing/invalid `DATABASE_URL`

## Next Steps

### 1. Restart Phase 2 Backend
```powershell
cd leave-attendance-backend
# Stop the current process (Ctrl+C)
npm start
```

### 2. Check Backend Logs
Look for error messages in the console. The improved error logging should now show:
- Database connection errors
- SQL query errors
- Missing user errors

### 3. Verify Database Tables
The tables exist (confirmed). But verify they have the correct structure:
```powershell
docker exec itcenter_pg psql -U itcenter -d itcenter_auth -c "\d leave_requests"
```

### 4. Test API Endpoints
```powershell
# Test health check
curl http://localhost:3000/healthz

# Test with authentication token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/leave/balance
```

## Common Issues & Solutions

### Issue: "User not found in database"
**Solution**: The user must exist in `app_users` table. Make sure you've logged in through the Phase 1 backend first, which creates the user record.

### Issue: "relation does not exist"
**Solution**: Run migrations:
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd flyway:migrate
```

### Issue: Database connection timeout
**Solution**: Check if PostgreSQL is running:
```powershell
docker ps | findstr itcenter_pg
```

## If Errors Persist

Check the backend console logs for the actual error message. The improved error handling should now show:
- The exact SQL query that failed
- The error message from PostgreSQL
- Stack trace

Share the error message from the backend console for further debugging.

