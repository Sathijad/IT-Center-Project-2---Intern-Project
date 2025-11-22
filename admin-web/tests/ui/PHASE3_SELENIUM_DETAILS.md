# Phase 3 Booking System - Complete Selenium Test Details

## 📋 Overview

This document provides **complete details** about the Phase 3 Booking System Selenium UI automation tests.

## 🎯 What Phase 3 Tests Cover

Phase 3 tests validate the **complete booking system** including:
- Room booking functionality
- Booking management
- Admin booking features
- Reports and analytics

## 🚀 How to Run Phase 3 Tests

### Command (Visible Browser Window)

```powershell
cd admin-web
npm run ui:test:phase3
```

**This will:**
- ✅ Open a **visible Chrome browser window** (you can watch the tests run)
- ✅ Use real credentials: `admin@test.com` / `Admin@123`
- ✅ Pause for manual verification code entry
- ✅ Test all Phase 3 booking features

## 📝 Complete Test Breakdown

### Test Suite Structure

The Phase 3 test suite (`phase3-booking.spec.ts`) contains **4 main test groups**:

---

### 1. **Authentication Flow** Test

**Test Name:** `should successfully login with admin credentials and handle verification code`

**What it does:**
1. Navigates to login page (`http://localhost:5173/login`)
2. Clicks "Sign in with Cognito" button
3. Waits for redirect to AWS Cognito login page
4. Enters email: `admin@test.com`
5. Enters password: `Admin@123`
6. Clicks Sign In button
7. **⏸️ PAUSES** - Waits for you to manually enter verification code
8. Verifies successful redirect back to application
9. Checks that dashboard is displayed

**Expected Duration:** 2-5 minutes (depending on verification code entry)

**Manual Steps Required:**
- When test pauses, check your email/SMS for verification code
- Enter the code in the browser window
- Click Verify/Submit button
- Test will automatically continue

---

### 2. **Employee Booking Features** Tests

#### Test 2.1: `should navigate to Book Room page and search for rooms`

**What it does:**
1. Navigates to Book Room page (`/bookings/new`)
2. Tests room search functionality
3. Searches for rooms with capacity filter
4. Verifies rooms are displayed
5. Counts number of rooms found

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Book Room page loads correctly
- ✅ Room search works
- ✅ Rooms are displayed

---

#### Test 2.2: `should be able to view room availability`

**What it does:**
1. Navigates to Book Room page
2. Enters start date/time (2 hours from now)
3. Enters end date/time (3 hours from now)
4. Checks if availability information is displayed

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Date/time inputs work
- ✅ Availability check functionality
- ✅ Availability status is shown

---

#### Test 2.3: `should navigate to My Bookings page`

**What it does:**
1. Navigates to My Bookings page (`/bookings/my`)
2. Checks if bookings are displayed
3. Counts number of bookings
4. Verifies page loads correctly

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ My Bookings page loads
- ✅ Bookings are displayed (if any exist)
- ✅ Page navigation works

---

### 3. **Admin Booking Features** Tests

#### Test 3.1: `should navigate to Booking Rooms page (Admin)`

**What it does:**
1. Navigates to Admin Booking Rooms page (`/admin/booking/rooms`)
2. Verifies page loads (Admin only)
3. Checks if room list is visible
4. Counts number of rooms

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Admin-only page access works
- ✅ Room list displays correctly
- ✅ Admin permissions are enforced

---

#### Test 3.2: `should navigate to Booking Blackouts page (Admin)`

**What it does:**
1. Navigates to Booking Blackouts page (`/admin/booking/blackouts`)
2. Verifies page loads (Admin only)
3. Checks if blackout windows are displayed
4. Counts number of blackouts

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Blackouts page loads
- ✅ Blackout list displays
- ✅ Admin access works

---

#### Test 3.3: `should navigate to Admin Bookings page and test filters`

**What it does:**
1. Navigates to Admin Bookings page (`/admin/booking/bookings`)
2. Verifies filters are visible
3. Tests filtering by status (CONFIRMED)
4. Counts number of bookings displayed

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Admin Bookings page loads
- ✅ Filters are functional
- ✅ Status filter works
- ✅ Bookings are displayed

---

#### Test 3.4: `should navigate to Booking Reports page`

**What it does:**
1. Navigates to Booking Reports page (`/admin/booking/reports`)
2. Verifies reports are visible
3. Sets date range (first of month to today)
4. Retrieves utilization statistics
5. Counts number of stats displayed

**Expected Duration:** 30-60 seconds

**What it validates:**
- ✅ Reports page loads
- ✅ Date range selection works
- ✅ Utilization stats are calculated
- ✅ Reports display correctly

---

### 4. **Phase 3 Navigation Flow** Test

**Test Name:** `should navigate through all Phase 3 booking pages`

**What it does:**
1. Navigates to Dashboard
2. Navigates to Book Room (Employee)
3. Navigates to My Bookings (Employee)
4. Navigates to Admin Bookings
5. Navigates to Booking Rooms (Admin)
6. Navigates to Booking Blackouts (Admin)
7. Navigates to Booking Reports (Admin)

**Expected Duration:** 1-2 minutes

**What it validates:**
- ✅ All Phase 3 pages are accessible
- ✅ Navigation between pages works
- ✅ No broken links or redirects

---

## 📊 Test Summary

| Test Group | Number of Tests | Duration | Manual Steps |
|------------|----------------|----------|--------------|
| Authentication Flow | 1 | 2-5 min | ✅ Verification code |
| Employee Features | 3 | 2-3 min | ❌ None |
| Admin Features | 4 | 2-3 min | ❌ None |
| Navigation Flow | 1 | 1-2 min | ❌ None |
| **Total** | **9 tests** | **7-13 min** | **1 pause** |

## 🔧 Test Configuration

### Credentials Used

- **Email:** `admin@test.com`
- **Password:** `Admin@123`
- **Location:** `admin-web/tests/ui/helpers/test-data.ts`

### Browser Settings

- **Browser:** Chrome
- **Mode:** Visible window (HEADFUL=true)
- **Window Size:** 1920x1080
- **Timeout:** 600 seconds (10 minutes) per test

### Base URLs

- **Frontend:** `http://localhost:5173` (default)
- **Auth Backend:** `http://localhost:8080`
- **Booking Backend:** Configured via environment variables

## 📁 Files Involved

### Test Files

1. **`phase3-booking.spec.ts`** - Main test suite
   - Location: `admin-web/tests/ui/phase3-booking.spec.ts`
   - Contains all 9 test cases

### Page Object Files

2. **`BookRoomPage.ts`** - Room booking page interactions
3. **`MyBookingsPage.ts`** - My bookings page interactions
4. **`BookingRoomsPage.ts`** - Admin rooms page interactions
5. **`BookingBlackoutsPage.ts`** - Blackouts page interactions
6. **`AdminBookingsPage.ts`** - All bookings page interactions
7. **`BookingReportsPage.ts`** - Reports page interactions
8. **`CognitoLoginPage.ts`** - AWS Cognito login handling
9. **`LoginPage.ts`** - Application login page
10. **`DashboardPage.ts`** - Dashboard page

**Location:** `admin-web/tests/ui/page-objects/`

### Helper Files

11. **`test-base.ts`** - WebDriver setup and utilities
12. **`test-data.ts`** - Test credentials and constants

**Location:** `admin-web/tests/ui/helpers/`

## 🎬 Step-by-Step Test Execution Flow

### When You Run `npm run ui:test:phase3`:

1. **Browser Opens** (Chrome window appears)

2. **Authentication Test Starts:**
   - Browser navigates to login page
   - You see "Sign in with Cognito" button
   - Test clicks the button
   - Browser redirects to AWS Cognito
   - Test enters email and password
   - Test clicks Sign In
   - **⏸️ TEST PAUSES HERE**
   - Console shows: "PAUSED FOR MANUAL VERIFICATION CODE"
   - **YOU ENTER VERIFICATION CODE**
   - Test continues automatically
   - Browser redirects back to dashboard

3. **Employee Features Tests:**
   - Book Room page opens
   - Room search is tested
   - Availability check is tested
   - My Bookings page opens

4. **Admin Features Tests:**
   - Booking Rooms page opens
   - Booking Blackouts page opens
   - Admin Bookings page opens (with filters)
   - Booking Reports page opens

5. **Navigation Test:**
   - Browser navigates through all pages
   - Each page is verified

6. **Test Completes:**
   - Browser closes
   - Results displayed in console

## ✅ What Gets Tested

### Employee Features ✅
- [x] Book Room page navigation
- [x] Room search functionality
- [x] Room availability checking
- [x] My Bookings page navigation
- [x] Booking list display

### Admin Features ✅
- [x] Booking Rooms page (Admin only)
- [x] Booking Blackouts page (Admin only)
- [x] Admin Bookings page with filters
- [x] Booking Reports page with utilization stats
- [x] Date range filtering
- [x] Status filtering

### Navigation ✅
- [x] Dashboard → Book Room
- [x] Book Room → My Bookings
- [x] My Bookings → Admin Bookings
- [x] Admin Bookings → Booking Rooms
- [x] Booking Rooms → Booking Blackouts
- [x] Booking Blackouts → Booking Reports

## ⚠️ Important Notes

### Manual Verification Code Entry

**When:** During the authentication test

**What to do:**
1. Test will pause and show message in console
2. Check your email or SMS for verification code
3. Look at the browser window - you'll see the verification code input field
4. Enter the code in the browser
5. Click Verify/Submit button
6. Test will automatically detect completion and continue

**Timeout:** Test waits up to 5 minutes (300 seconds) for you to enter the code

### Prerequisites

**Before running tests, ensure:**

1. ✅ Auth backend is running on `http://localhost:8080`
2. ✅ Booking backend is configured and accessible
3. ✅ Frontend dev server is running on `http://localhost:5173`
4. ✅ Database has booking tables migrated
5. ✅ User `admin@test.com` exists in Cognito
6. ✅ Chrome browser is installed

## 🐛 Troubleshooting

### Browser Doesn't Open

**Solution:**
- Check if Chrome is installed
- Verify `HEADFUL=true` is set (it's set by default in the command)
- Check ChromeDriver: `npm list chromedriver`

### Test Fails at Login

**Check:**
- Auth backend is running: `http://localhost:8080/healthz`
- Frontend is running: `http://localhost:5173`
- Credentials are correct: `admin@test.com` / `Admin@123`

### Verification Code Not Appearing

**Check:**
- Email inbox (including spam)
- SMS messages
- Test waits 5 minutes - be patient
- Check browser window for the input field

### Booking Pages Not Loading

**Check:**
- Booking backend API is accessible
- API URL is configured correctly
- Database has booking tables
- User has ADMIN role

### Element Not Found Errors

**Solution:**
- Run with visible browser (already enabled)
- Check browser window to see what's happening
- Verify pages are fully loaded
- Check backend API responses

## 📈 Expected Results

### Successful Test Run

You should see in the console:

```
Phase 3 - Booking System E2E Tests
  Authentication Flow
    ✓ should successfully login with admin credentials and handle verification code (50000ms)
  Employee Booking Features
    ✓ should navigate to Book Room page and search for rooms (30000ms)
    ✓ should be able to view room availability (30000ms)
    ✓ should navigate to My Bookings page (30000ms)
  Admin Booking Features
    ✓ should navigate to Booking Rooms page (Admin) (30000ms)
    ✓ should navigate to Booking Blackouts page (Admin) (30000ms)
    ✓ should navigate to Admin Bookings page and test filters (30000ms)
    ✓ should navigate to Booking Reports page (30000ms)
  Phase 3 Navigation Flow
    ✓ should navigate through all Phase 3 booking pages (60000ms)

9 passing (7-13 minutes)
```

## 📚 Related Files

- **Test Suite:** `admin-web/tests/ui/phase3-booking.spec.ts`
- **Page Objects:** `admin-web/tests/ui/page-objects/`
- **Test Guide:** `admin-web/tests/ui/PHASE3_TESTING_GUIDE.md`
- **Implementation:** `PHASE3_IMPLEMENTATION_SUMMARY.md`

## 🎯 Next Steps After Tests Pass

1. Review test results
2. Check for any warnings in console
3. Verify all features work as expected
4. Extend tests with more scenarios if needed
5. Add tests for booking creation/cancellation flows

---

**Ready to run?** Execute: `npm run ui:test:phase3`

