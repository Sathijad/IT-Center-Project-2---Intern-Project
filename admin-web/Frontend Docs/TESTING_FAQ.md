# Testing FAQ - Common Questions

## Q: Do I need to log in with real credentials?

**A: NO** ❌ 

You never need to log in manually. The tests work like this:

1. **Test seeds a fake token** (`e2e-token`) in localStorage
2. **json-server provides fake `/api/v1/me` response** (returns ADMIN user)
3. **App thinks you're logged in** without any real authentication

## Q: Why do I see the login page in tests?

**A: This means json-server is NOT running or the app can't reach it.**

### Quick Fix:

```powershell
# Make sure json-server is running
npm run e2e:api
```

**You should see:**
```
\{^_^}/ hi!
Resources
http://localhost:5050/api/v1/me
http://localhost:5050/api/v1/admin/users
...
```

### Test it manually:

Open browser and go to: `http://localhost:5050/api/v1/me`

**Expected:** Returns JSON with ADMIN user
**If error:** json-server is not running → Run `npm run e2e:api`

## Q: How do I run tests correctly?

### ✅ Correct Way (One Command):

```powershell
npm run e2e
```

This starts:
- json-server (mock API) on port 5050
- Web app (pointing to mock API) on port 5173  
- Runs all tests
- Stops everything when done

### ✅ Alternative (Three Terminals):

**Terminal 1:**
```powershell
npm run e2e:api
```

**Terminal 2:**
```powershell
npm run e2e:web
```

**Terminal 3 (wait for above to start):**
```powershell
npm run e2e:test
```

## Q: What if tests fail with "redirected to login"?

**Check these 3 things:**

### 1. Is json-server running?
```powershell
# Should show json-server output
npm run e2e:api
```

### 2. Is web app pointing to json-server?
Open browser console → Network tab → Look for API calls

**Should see:** `http://localhost:5050/api/v1/me`
**If you see:** `http://localhost:8080/api/v1/me` → Wrong! App is using real backend

**Fix:** Make sure you ran `npm run e2e:web` (not `npm run dev`)

### 3. Is token in localStorage?
Open browser console → Application → Local Storage → Should see `access_token`

## Q: Can I see what's happening during tests?

**Yes!** Run with visible browser:

```powershell
$env:HEADFUL="true"
npm run e2e:test
```

You'll see the browser window and can watch the test execution.

## Summary Table

| Question | Answer |
|----------|--------|
| Need real login? | ❌ No - Tests bypass login |
| Need Cognito? | ❌ No - Uses mock API |
| Need backend? | ❌ No - Uses json-server |
| Login page appears? | ✅ Fix: Start json-server |
| How to run? | ✅ `npm run e2e` |

---

**Bottom Line:** Just run `npm run e2e` and everything should work. No manual login needed!

