# E2E Testing Setup with json-server

This document explains how to run Selenium tests for Users and Audit pages **without needing a backend server**.

## What Was Implemented

### ✅ 1. Mock API Server (json-server)

**Files Created:**
- `mock/db.json` - Mock data for all API endpoints
- `mock/routes.json` - API route mappings to match your backend structure

**What it does:**
- Runs on port 5050
- Provides mock responses for:
  - `GET /api/v1/me` → Returns ADMIN user
  - `GET /api/v1/admin/users` → Returns list of users
  - `GET /api/v1/admin/users/:id` → Returns user details
  - `PUT /api/v1/admin/users/:id` → Updates user (for role changes)
  - `GET /api/v1/admin/audit-log` → Returns audit log entries

### ✅ 2. Updated Test Configuration

**Enhanced `test-base.ts`:**
- Added stronger explicit waits (30-60s timeouts)
- Set implicit wait = 0 (prevents flakiness)
- Added `seedAuthToken()` helper function
- Added `waitForElementVisible()` for reliable element detection

**Updated Test Files:**
- `tests/ui/users.roles.spec.ts` - Simplified, uses mock API
- `tests/ui/audit.spec.ts` - Simplified, uses mock API

### ✅ 3. NPM Scripts Added

```json
"e2e:api": "json-server --watch mock/db.json --routes mock/routes.json --port 5050"
"e2e:web": "cross-env VITE_API_BASE_URL=http://localhost:5050 vite --port 5173"
"e2e:test": "... mocha tests ..."
"e2e": "concurrently -k -s first \"npm: e2e:api\" \"npm: e2e:web\" \"npm run e2e:test\""
```

## How It Works

### The Flow

1. **json-server starts** on port 5050 with mock data
2. **Vite dev server starts** on port 5173, pointing to `VITE_API_BASE_URL=http://localhost:5050`
3. **Test seeds auth token** in localStorage (`e2e-token`)
4. **App loads** and calls `/api/v1/me` → json-server returns ADMIN user
5. **AuthContext authenticates** successfully (no redirect to login)
6. **Tests can access** `/users` and `/audit` pages

### Why This Works

- ✅ No backend needed - json-server provides REST API
- ✅ Real HTTP requests - tests actual network behavior
- ✅ Environment variable - app points to mock API only during tests
- ✅ Strong waits - tests are resilient to slow dev servers

## Running the Tests

### Option 1: Run Everything Together (Recommended)

```powershell
npm run e2e
```

This command:
- Starts json-server on port 5050
- Starts Vite dev server on port 5173 (with mock API)
- Runs all Selenium tests
- Kills everything when tests complete

### Option 2: Run Components Separately

**Terminal 1 - Start mock API:**
```powershell
npm run e2e:api
```

**Terminal 2 - Start web app with mock API:**
```powershell
npm run e2e:web
```

**Terminal 3 - Run tests:**
```powershell
npm run e2e:test
```

## Current Test Status

### ✅ User Role Management Tests
- `should open Users page and list users` - Verifies page loads, users visible
- `should open user detail page from users list` - Verifies navigation works

### ✅ Audit Log Tests  
- `should show audit log with role events` - Verifies page loads, headers present, role events visible

## Troubleshooting

### Issue: Tests redirect to login page

**Error Message:**
```
Users title not visible — redirected to login (auth not satisfied).
Make sure json-server is running on port 5050 and VITE_API_BASE_URL=http://localhost:5050
```

**Solutions:**
1. Check json-server is running: `npm run e2e:api`
2. Verify port 5050 is not in use
3. Check web app is using mock API: `VITE_API_BASE_URL=http://localhost:5050`
4. Verify token is seeded: Check browser console for localStorage

### Issue: Timeout errors

**Solutions:**
1. Increase timeout in test file: `this.timeout(120000)` → `this.timeout(180000)`
2. Check dev server is slow - wait longer
3. Run with `HEADFUL=true` to see what's happening

### Issue: Cannot find elements

**Solutions:**
1. Check if page actually loaded - verify URL in browser
2. Use `HEADFUL=true` to debug visually
3. Check selector matches actual DOM (use browser DevTools)

## Data Test IDs (Optional Enhancement)

For more reliable tests, add `data-testid` attributes to UI components:

```tsx
// Users page
<h1 data-testid="users-title">Users</h1>
<button data-testid="user-view-btn">View</button>

// Audit page
<h1 data-testid="audit-title">Audit Log</h1>
```

Tests already support both `data-testid` and fallback text locators.

## Mock Data Structure

### `/api/v1/me`
```json
{
  "id": 1,
  "email": "admin@itcenter.com",
  "displayName": "Test Admin",
  "roles": ["ADMIN"]
}
```

### `/api/v1/admin/users`
```json
[
  {
    "id": 101,
    "email": "user1@itcenter.com",
    "displayName": "User One",
    "roles": ["EMPLOYEE"]
  },
  {
    "id": 102,
    "email": "user2@itcenter.com",
    "displayName": "User Two",
    "roles": ["EMPLOYEE", "HR"]
  }
]
```

### `/api/v1/admin/audit-log`
```json
[
  {
    "id": 1,
    "createdAt": "2025-10-28T10:00:00Z",
    "userEmail": "admin@itcenter.com",
    "eventType": "ROLE_ASSIGNED",
    "ipAddress": "127.0.0.1"
  },
  {
    "id": 2,
    "createdAt": "2025-10-28T10:05:00Z",
    "userEmail": "admin@itcenter.com",
    "eventType": "ROLE_REMOVED",
    "ipAddress": "127.0.0.1"
  }
]
```

## Next Steps

1. **Run tests:** `npm run e2e`
2. **Add more tests:** Follow the pattern in existing test files
3. **Add data-testid attributes:** Improve test reliability (optional)
4. **Extend mock data:** Add more scenarios to `mock/db.json`

## Key Changes Summary

| File | What Changed |
|------|-------------|
| `mock/db.json` | Created - Mock API data |
| `mock/routes.json` | Created - API route mappings |
| `tests/ui/helpers/test-base.ts` | Enhanced - Stronger waits, seedAuthToken() |
| `tests/ui/users.roles.spec.ts` | Simplified - Uses mock API, stronger waits |
| `tests/ui/audit.spec.ts` | Simplified - Uses mock API, stronger waits |
| `package.json` | Added - e2e scripts |

---

**Last Updated:** October 29, 2025  
**Status:** ✅ Ready to run

