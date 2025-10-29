# No Manual Login Needed - How E2E Tests Work

## ✅ You DO NOT Need to Log In Manually

The tests are designed to **bypass the actual Cognito login** by using:

1. **Mock API Server (json-server)** - Provides fake `/api/v1/me` response
2. **Token Seeding** - Sets token in localStorage before app loads
3. **Mock Authentication** - App thinks you're logged in as ADMIN

## How It Works

```
┌─────────────────────────────────────────────────┐
│ 1. Test starts                                   │
│    → Seeds token: localStorage.setItem('token')  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. Navigate to /users                           │
│    → App calls AuthContext                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. AuthContext checks:                          │
│    → Does token exist? ✓ Yes                    │
│    → Calls /api/v1/me → json-server              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. json-server responds:                        │
│    → { id: 1, email: "admin@...",              │
│         roles: ["ADMIN"] }                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. AuthContext sets user = ADMIN                │
│    → isAuthenticated = true                     │
│    → ProtectedRoute allows access              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. Test can access /users page ✓                │
└─────────────────────────────────────────────────┘
```

## ❌ If Login Page Appears

This means **json-server is NOT working**. Check:

### 1. Is json-server running?

```powershell
# Should show json-server running on port 5050
npm run e2e:api
```

**Expected output:**
```
\{^_^}/ hi!

Loading mock/db.json
Done

Resources
http://localhost:5050/me
http://localhost:5050/users
...

Type s + enter at any time to create a snapshot of the database
```

### 2. Is web app pointing to json-server?

```powershell
# Should set VITE_API_BASE_URL=http://localhost:5050
npm run e2e:web
```

**Check:** Open browser console and look for API calls. They should go to `http://localhost:5050`, NOT `http://localhost:8080`.

### 3. Quick Test: Check json-server manually

Open browser and go to:
```
http://localhost:5050/api/v1/me
```

**Expected response:**
```json
{
  "id": 1,
  "email": "admin@itcenter.com",
  "displayName": "Test Admin",
  "roles": ["ADMIN"]
}
```

If you get an error or connection refused → json-server is not running.

## 🚀 The Right Way to Run Tests

### Option 1: All-in-One (Recommended)
```powershell
npm run e2e
```

This automatically:
- Starts json-server (port 5050)
- Starts web app with mock API (port 5173)
- Runs tests
- Stops everything when done

### Option 2: Separate Terminals

**Terminal 1:** Start mock API
```powershell
npm run e2e:api
```

**Terminal 2:** Start web app with mock API
```powershell
npm run e2e:web
```

**Terminal 3:** Run tests (after API and web are ready)
```powershell
npm run e2e:test
```

## 📝 Summary

| Question | Answer |
|----------|--------|
| Need to log in manually? | ❌ **NO** - Tests bypass login |
| Need real Cognito credentials? | ❌ **NO** - Uses mock API |
| Need backend server? | ❌ **NO** - Uses json-server |
| What if login page appears? | ✅ json-server not running or web app not pointing to it |

## 🔍 Debug Steps

If tests redirect to login page:

1. **Check json-server:** `http://localhost:5050/api/v1/me` should return ADMIN user
2. **Check web app:** Browser console should show API calls to `localhost:5050`, not `8080`
3. **Check token:** Browser console → localStorage → should have `access_token`
4. **Check test logs:** Should see "Auth token seeded in localStorage"

---

**Remember:** The tests are designed to work WITHOUT any real authentication or backend. Everything is mocked via json-server.

