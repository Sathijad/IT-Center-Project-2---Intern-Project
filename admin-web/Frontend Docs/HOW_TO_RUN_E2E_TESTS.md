# How to Run E2E Tests - Simple Guide

## 🚀 Quick Start

**Just run one command:**

```powershell
npm run e2e
```

That's it! This will:
1. ✅ Start mock API server (port 5050)
2. ✅ Start web app with mock API (port 5173)
3. ✅ Run all Selenium tests
4. ✅ Stop everything when done

## 📋 What Happens When You Run `npm run e2e`

### Step 1: Mock API Starts
```
[json-server] JSON Server is running on http://localhost:5050
[json-server] Resources: /api/v1/me, /api/v1/admin/users, ...
```

### Step 2: Web App Starts
```
[vite] VITE_API_BASE_URL=http://localhost:5050
[vite] Local: http://localhost:5173
```

### Step 3: Tests Run
```
[test] User Role Management
[test]   ✓ should open Users page and list users
[test]   ✓ should open user detail page from users list
[test] Audit Log
[test]   ✓ should show audit log with role events
```

### Step 4: Everything Stops
All processes automatically stop when tests finish.

## ⚠️ If Something Goes Wrong

### Error: "redirected to login"

**Problem:** json-server not running or web app not pointing to it.

**Fix:**
1. Make sure json-server started (check for port 5050 messages)
2. Make sure web app shows `VITE_API_BASE_URL=http://localhost:5050`
3. Wait a few seconds after starting before tests run

### Error: "Port 5050 already in use"

**Fix:** Something else is using port 5050. Close it or change port in `mock/server.js`.

### Tests are slow or timing out

**Fix:** Increase timeout in test files:
```typescript
this.timeout(180000); // 3 minutes instead of 2
```

## 🎯 Alternative: Run Components Separately

If `npm run e2e` doesn't work, run in separate terminals:

### Terminal 1: Mock API
```powershell
npm run e2e:api
```
**Wait for:** "JSON Server is running on http://localhost:5050"

### Terminal 2: Web App
```powershell
npm run e2e:web
```
**Wait for:** "Local: http://localhost:5173"

### Terminal 3: Tests (after above are ready)
```powershell
npm run e2e:test
```

## ✅ Expected Output

When everything works, you'll see:

```
[0] JSON Server is running on http://localhost:5050
[1] VITE v5.x.x  ready in xxx ms
[1] ➜  Local:   http://localhost:5173
[2] 
[2]   User Role Management
[2]     ✓ should open Users page and list users (15s)
[2]     ✓ should open user detail page from users list (8s)
[2] 
[2]   Audit Log
[2]     ✓ should show audit log with role events (12s)
[2] 
[2]   3 passing (45s)
```

## 🔍 Debug Mode (See Browser)

To see what's happening:

```powershell
$env:HEADFUL="true"
npm run e2e:test
```

This opens a visible Chrome window so you can watch the tests.

## ❓ Common Questions

**Q: Do I need to log in?**  
A: NO - Tests automatically bypass login using mock API.

**Q: How long do tests take?**  
A: Usually 30-60 seconds for all tests.

**Q: Can I run just one test?**  
A: Yes! Modify the test file and add `.only()`:
```typescript
it.only('should open Users page...', async () => { ... });
```

---

**That's it! Just run `npm run e2e` and watch it work.** 🎉

