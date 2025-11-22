# Phase 3 Booking System - Individual Test Commands

This document lists all individual test commands for Phase 3 Booking System Selenium tests.

## 📋 All Phase 3 Test Commands

### 1. **Run All Phase 3 Tests** (Complete Suite)
```powershell
npm run ui:test:phase3
```
**What it runs:** All 9 tests including authentication, employee features, admin features, and navigation
**Duration:** ~10-15 minutes (includes manual verification code entry)

---

### 2. **Authentication Flow Test Only**
```powershell
npm run ui:test:phase3:auth
```
**What it runs:** 
- Login with real credentials (`admin@test.com` / `Admin@123`)
- Enter email and password automatically
- Click Sign In button
- **⏸️ PAUSES** - You enter verification code manually
- Verifies successful login and dashboard access

**Duration:** 2-5 minutes (depends on verification code entry)

**Test Name:** `should successfully login with admin credentials and handle verification code`

---

### 3. **Employee Booking Features Tests**
```powershell
npm run ui:test:phase3:employee
```
**What it runs:**
- Test 1: Navigate to Book Room page and search for rooms
- Test 2: View room availability
- Test 3: Navigate to My Bookings page

**Duration:** 2-3 minutes

**Test Names:**
- `should navigate to Book Room page and search for rooms`
- `should be able to view room availability`
- `should navigate to My Bookings page`

**Note:** Requires authentication first (run auth test before this)

---

### 4. **Admin Booking Features Tests**
```powershell
npm run ui:test:phase3:admin
```
**What it runs:**
- Test 1: Navigate to Booking Rooms page (Admin)
- Test 2: Navigate to Booking Blackouts page (Admin)
- Test 3: Navigate to Admin Bookings page and test filters
- Test 4: Navigate to Booking Reports page

**Duration:** 2-3 minutes

**Test Names:**
- `should navigate to Booking Rooms page (Admin)`
- `should navigate to Booking Blackouts page (Admin)`
- `should navigate to Admin Bookings page and test filters`
- `should navigate to Booking Reports page`

**Note:** Requires authentication first (run auth test before this)

---

### 5. **Navigation Flow Test Only**
```powershell
npm run ui:test:phase3:navigation
```
**What it runs:**
- Navigates through all Phase 3 booking pages
- Tests navigation between Dashboard, Book Room, My Bookings, Admin Bookings, Booking Rooms, Booking Blackouts, and Booking Reports

**Duration:** 1-2 minutes

**Test Name:** `should navigate through all Phase 3 booking pages`

**Note:** Requires authentication first (run auth test before this)

---

## 🎯 Recommended Test Execution Order

### Option 1: Run All Tests (Recommended for First Time)
```powershell
npm run ui:test:phase3
```
This runs everything in sequence.

### Option 2: Run Tests Individually (For Debugging)

**Step 1: Authentication**
```powershell
npm run ui:test:phase3:auth
```
- Enter verification code when prompted
- Wait for test to complete

**Step 2: Employee Features**
```powershell
npm run ui:test:phase3:employee
```

**Step 3: Admin Features**
```powershell
npm run ui:test:phase3:admin
```

**Step 4: Navigation**
```powershell
npm run ui:test:phase3:navigation
```

---

## 📊 Test Summary Table

| Command | Test Group | Number of Tests | Duration | Manual Steps |
|---------|-----------|----------------|----------|--------------|
| `ui:test:phase3` | All Tests | 9 | 10-15 min | ✅ Verification code |
| `ui:test:phase3:auth` | Authentication | 1 | 2-5 min | ✅ Verification code |
| `ui:test:phase3:employee` | Employee Features | 3 | 2-3 min | ❌ None |
| `ui:test:phase3:admin` | Admin Features | 4 | 2-3 min | ❌ None |
| `ui:test:phase3:navigation` | Navigation | 1 | 1-2 min | ❌ None |

---

## 🔍 Running Individual Tests with Mocha Grep

You can also run individual tests by name using `--grep`:

### Run Specific Test by Name
```powershell
# Example: Run only "Book Room page" test
cross-env NODE_OPTIONS="--loader ts-node/esm" TS_NODE_TRANSPILE_ONLY=true HEADFUL=true mocha tests/ui/phase3-booking.spec.ts -r ts-node/esm --grep "should navigate to Book Room page" --timeout 600000
```

### Available Test Names

**Authentication:**
- `should successfully login with admin credentials and handle verification code`

**Employee Features:**
- `should navigate to Book Room page and search for rooms`
- `should be able to view room availability`
- `should navigate to My Bookings page`

**Admin Features:**
- `should navigate to Booking Rooms page (Admin)`
- `should navigate to Booking Blackouts page (Admin)`
- `should navigate to Admin Bookings page and test filters`
- `should navigate to Booking Reports page`

**Navigation:**
- `should navigate through all Phase 3 booking pages`

---

## ⚙️ Configuration

All commands run with:
- **Visible Browser:** `HEADFUL=true` (you can see the browser)
- **Timeout:** 600 seconds (10 minutes) per test
- **Base URL:** `http://localhost:5173` (default)

### Change Settings

**Run in headless mode:**
```powershell
$env:HEADFUL="false"
npm run ui:test:phase3:auth
```

**Change base URL:**
```powershell
$env:WEB_BASE_URL="http://your-url:port"
npm run ui:test:phase3:auth
```

---

## 📝 Quick Reference

```powershell
# All Phase 3 tests
npm run ui:test:phase3

# Individual test groups
npm run ui:test:phase3:auth          # Authentication only
npm run ui:test:phase3:employee       # Employee features only
npm run ui:test:phase3:admin          # Admin features only
npm run ui:test:phase3:navigation      # Navigation only
```

---

## 🐛 Troubleshooting

### Test Fails Because Not Authenticated

**Solution:** Run authentication test first:
```powershell
npm run ui:test:phase3:auth
```
Then run other tests.

### Browser Doesn't Open

**Check:** All commands have `HEADFUL=true` by default. If browser doesn't open:
- Verify Chrome is installed
- Check ChromeDriver: `npm list chromedriver`

### Verification Code Not Working

**Check:**
- Email/SMS for code
- Spam folder
- Test waits 5 minutes for manual entry
- Browser window is visible

---

## 📚 Related Documentation

- **Complete Details:** `PHASE3_SELENIUM_DETAILS.md`
- **Testing Guide:** `PHASE3_TESTING_GUIDE.md`
- **All Tests List:** `SELENIUM_TESTS_LIST.md`

