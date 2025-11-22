# Phase 3 Booking System - Selenium Testing Guide

## Overview

This guide explains how to run the Selenium UI automation tests for **Phase 3: Booking System** features in the Admin Portal.

## Prerequisites

1. **Node.js 18+** installed
2. **Chrome browser** installed
3. **Backend services** running:
   - Auth backend on `http://localhost:8080`
   - Booking backend (Serverless/Lambda) configured and running
   - Frontend dev server on `http://localhost:5173`
4. **Admin credentials**:
   - Email: `admin@test.com`
   - Password: `Admin@123`

## Test Credentials

The tests use the following credentials (configured in `test-data.ts`):
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

## Running Phase 3 Tests

### Option 1: Run Phase 3 Tests Only (Recommended)

This runs the complete Phase 3 booking system test suite:

```powershell
cd admin-web
npm run ui:test:phase3
```

### Option 2: Run with Visible Browser (for debugging)

To see the browser during test execution:

```powershell
$env:HEADFUL="true"
npm run ui:test:phase3
```

### Option 3: Run All UI Tests

This runs all UI tests including Phase 3:

```powershell
cd admin-web
npm run ui:test
```

## Test Coverage

The Phase 3 test suite (`phase3-booking.spec.ts`) covers:

### 1. Authentication Flow
- ✅ Login with real Cognito credentials
- ✅ Manual verification code entry (pauses for user input)
- ✅ Successful redirect to dashboard

### 2. Employee Booking Features
- ✅ **Book Room Page**: Navigate, search rooms, check availability
- ✅ **My Bookings Page**: View bookings, cancel bookings

### 3. Admin Booking Features
- ✅ **Booking Rooms Page**: View room list (Admin only)
- ✅ **Booking Blackouts Page**: View blackout windows (Admin only)
- ✅ **Admin Bookings Page**: View all bookings with filters (Admin only)
- ✅ **Booking Reports Page**: View utilization reports (Admin only)

### 4. Navigation Flow
- ✅ Navigate through all Phase 3 pages
- ✅ Verify page accessibility

## Test Flow

1. **Authentication**
   - Navigates to login page
   - Clicks "Sign in with Cognito"
   - Enters email (`admin@test.com`)
   - Enters password (`Admin@123`)
   - **⏸️ PAUSES for manual verification code entry** (if MFA enabled)
   - Verifies successful login

2. **Employee Features Testing**
   - Tests Book Room page functionality
   - Tests room search and availability
   - Tests My Bookings page

3. **Admin Features Testing**
   - Tests all admin-only booking pages
   - Tests filtering and reporting features

4. **Navigation Testing**
   - Tests navigation between all Phase 3 pages

## Manual Verification Code Entry

When the test reaches the verification code step:

1. **Test will pause** and display a message in console
2. **Wait up to 5 minutes** for you to:
   - Check your email/SMS for verification code
   - Enter code in the browser
   - Click Verify/Submit button
3. **Automatically continue** once verification is complete

### Console Message

```
========================================
⏸️  PAUSED FOR MANUAL VERIFICATION CODE
========================================
Please manually enter the verification code in the browser.
Waiting up to 300 seconds for you to complete verification...
========================================
```

## Page Objects Created

The following page objects are available for Phase 3:

- **`BookRoomPage.ts`** - Room booking functionality
- **`MyBookingsPage.ts`** - User bookings management
- **`BookingRoomsPage.ts`** - Admin room management
- **`BookingBlackoutsPage.ts`** - Blackout window management
- **`AdminBookingsPage.ts`** - All bookings view with filters
- **`BookingReportsPage.ts`** - Utilization reports

## Environment Variables

Customize test behavior:

```powershell
# Set base URL (default: http://localhost:5173)
$env:WEB_BASE_URL="http://localhost:5173"

# Enable visible browser (default: headless)
$env:HEADFUL="true"
```

## Test Structure

```
tests/ui/
├── phase3-booking.spec.ts          # Main Phase 3 test suite
├── page-objects/
│   ├── BookRoomPage.ts             # Room booking page
│   ├── MyBookingsPage.ts           # My bookings page
│   ├── BookingRoomsPage.ts         # Admin rooms page
│   ├── BookingBlackoutsPage.ts     # Blackouts page
│   ├── AdminBookingsPage.ts        # All bookings page
│   ├── BookingReportsPage.ts       # Reports page
│   ├── CognitoLoginPage.ts         # Cognito login handling
│   ├── LoginPage.ts                # App login page
│   └── DashboardPage.ts            # Dashboard page
├── helpers/
│   ├── test-base.ts                # WebDriver setup
│   └── test-data.ts                # Test credentials
└── PHASE3_TESTING_GUIDE.md         # This file
```

## Troubleshooting

### Test Fails at Login

- **Check backend**: Ensure auth backend is running on `http://localhost:8080`
- **Check frontend**: Ensure dev server is on `http://localhost:5173`
- **Check booking backend**: Ensure booking backend is configured and accessible
- **Verify credentials**: Check `admin@test.com` / `Admin@123` are correct

### Booking Pages Not Loading

- **Check booking backend**: Ensure booking API is accessible
- **Check API URL**: Verify booking API URL in frontend config
- **Check database**: Ensure booking tables are migrated
- **Check permissions**: Verify user has ADMIN role for admin pages

### Verification Code Issues

- **Check email/SMS**: Code may be delayed
- **Check spam folder**: Verification emails sometimes go to spam
- **Increase timeout**: Test waits 5 minutes by default
- **Check browser console**: Look for JavaScript errors

### Element Not Found Errors

- **Wait for page load**: Some pages take time to load
- **Check selectors**: Page structure may have changed
- **Run with visible browser**: Use `HEADFUL=true` to debug
- **Check API responses**: Ensure backend is returning data

## Best Practices

1. **Run with visible browser first**: Use `HEADFUL=true` to verify everything works
2. **Check console output**: Tests log detailed information
3. **Keep browser open**: Don't close during verification code entry
4. **One test at a time**: Don't run multiple instances
5. **Clean state**: Clear browser cache if tests behave unexpectedly
6. **Check backend logs**: Monitor backend for API errors

## Expected Test Duration

- **Full test suite**: ~10-15 minutes (including manual verification)
- **Without verification**: ~5-8 minutes
- **Individual test groups**: ~2-3 minutes each

## Next Steps

After running tests successfully:

1. **Extend coverage**: Add more test cases for edge cases
2. **Add booking creation**: Test actual booking creation flow
3. **Add blackout creation**: Test blackout window creation
4. **Add cancellation**: Test booking cancellation flow
5. **Add filters**: Test all filter combinations
6. **Add reports**: Test report generation and metrics

## Support

If you encounter issues:

1. Check console output for detailed error messages
2. Run with `HEADFUL=true` to see browser actions
3. Verify all prerequisites are met
4. Check backend and frontend services are running
5. Review test code in `phase3-booking.spec.ts`
6. Check booking backend logs for API errors

## Related Documentation

- **Phase 3 Implementation Summary**: `PHASE3_IMPLEMENTATION_SUMMARY.md`
- **Booking Runbook**: `docs/booking-runbook.md`
- **OpenAPI Spec**: `docs/openapi/booking.yaml`
- **General Selenium Guide**: `SELENIUM_TESTING_GUIDE.md`

