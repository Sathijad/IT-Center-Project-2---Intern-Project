# Environment Variables Setup Guide

This guide explains what needs to be configured in the `.env` file for the Leave & Attendance API.

## Quick Setup

Simply copy the example file:

```powershell
cd leave-attendance-api
copy .env.example .env
```

The `.env` file is already pre-configured with Phase 1 values, so **you don't need to change anything** if you're using the same setup.

## Environment Variables Explained

### ✅ Required Configuration (Already Set)

These are already configured to match Phase 1:

#### Server Configuration
- `NODE_ENV=development` - Environment mode
- `PORT=8082` - API server port (different from Phase 1's 8080)

#### Database Configuration
All values match Phase 1 database:
- `DB_HOST=localhost` - PostgreSQL host
- `DB_PORT=5432` - PostgreSQL port
- `DB_NAME=itcenter_auth` - Database name (same as Phase 1)
- `DB_USER=itcenter` - Database username
- `DB_PASSWORD=password` - Database password
- `DB_MAX_CLIENTS=20` - Max connection pool size
- `DB_IDLE_TIMEOUT_MS=30000` - Connection idle timeout

#### AWS Cognito Configuration
All values match Phase 1 Cognito setup:
- `COGNITO_USER_POOL_ID=ap-southeast-2_hTAYJId8y`
- `COGNITO_CLIENT_ID=3rdnl5ind8guti89jrbob85r4i`
- `COGNITO_REGION=ap-southeast-2`
- `COGNITO_ISSUER=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y`
- `COGNITO_JWK_SET_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json`
- `JWKS_CACHE_TTL=600` - JWKS cache time-to-live in seconds
- `CLOCK_SKEW_SECONDS=120` - JWT clock skew tolerance

### 🔧 Optional Configuration

#### Feature Flags
- `ENABLE_GEO_VALIDATION=false` - Enable geolocation validation for clock-in (set to `true` when ready)
- `ENABLE_CALENDAR_SYNC=true` - Enable Microsoft Graph calendar sync (stub for now)

#### Microsoft Graph (Future Integration)
Leave empty for now - configure when implementing calendar sync:
- `MSGRAPH_TENANT_ID=` - Azure AD tenant ID
- `MSGRAPH_CLIENT_ID=` - Azure AD app client ID
- `MSGRAPH_CLIENT_SECRET=` - Azure AD app client secret (store in AWS Secrets Manager in production)

#### AWS SES (Future Integration)
Leave empty for now - configure when implementing email notifications:
- `SES_REGION=ap-southeast-2` - AWS SES region
- `SES_FROM_EMAIL=noreply@yourdomain.tld` - Email sender address

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS=900000` - Rate limit window (15 minutes = 900,000 ms)
- `RATE_LIMIT_MAX_REQUESTS=100` - Max requests per window

## Verification

After setting up `.env`, verify the configuration:

1. **Check database connection:**
   ```powershell
   docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version();"
   ```

2. **Start the API server:**
   ```powershell
   cd leave-attendance-api
   npm run dev
   ```

3. **Check health endpoint:**
   ```powershell
   curl http://localhost:8082/healthz
   ```

4. **Check readiness (includes DB check):**
   ```powershell
   curl http://localhost:8082/readyz
   ```

Expected responses:
- `/healthz` → `{"status":"ok","timestamp":"..."}`
- `/readyz` → `{"status":"ready","timestamp":"..."}` (if DB is connected)

## Security Notes

⚠️ **Important:**
- The `.env` file is in `.gitignore` and should **never** be committed to git
- In production, use AWS Secrets Manager or environment variables from your deployment platform
- Never commit secrets or credentials
- The default password `password` is for development only

## Troubleshooting

### Database Connection Failed

1. **Check database is running:**
   ```powershell
   docker ps | findstr itcenter_pg
   ```

2. **Verify database credentials:**
   ```powershell
   docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "\conninfo"
   ```

3. **Check environment variables are loaded:**
   ```powershell
   # In Node.js, add debug logging
   console.log('DB_HOST:', process.env.DB_HOST);
   ```

### Cognito JWT Validation Failed

1. **Verify Cognito configuration matches Phase 1:**
   - Check `DATABASE_AND_COGNITO_CONFIG.md` for correct values
   - Ensure User Pool ID and Client ID are correct

2. **Test with a valid JWT token:**
   - Login via React app or Flutter app
   - Use the access token in API requests

### Port Already in Use

If port 8082 is already in use:
```powershell
# Change PORT in .env
PORT=8083  # or any available port
```

