# Selenium UI Automation Testing Guide

## Overview

This guide explains how to run the comprehensive Selenium tests for the Admin Portal with real AWS Cognito authentication.

## Prerequisites

1. **Node.js 18+** installed
2. **Chrome browser** installed
3. **Backend services** running:
   - Auth backend on `http://localhost:8080`
   - Frontend dev server on `http://localhost:5173`
4. **Admin credentials**:
   - Email: `admin@test.com`
   - Password: `Admin@123`

## Test Credentials

The tests use the following credentials (configured in `test-data.ts`):
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

## Running the Tests

### Option 1: Run Comprehensive Admin Tests (Recommended)

This runs the full test suite including login with real credentials:

```powershell
cd admin-web
npm run ui:test:admin
```

### Option 2: Run All UI Tests

This runs all UI tests including the comprehensive admin tests:

```powershell
cd admin-web
npm run ui:test
```

### Option 3: Run with Visible Browser (for debugging)

To see the browser during test execution:

```powershell
$env:HEADFUL="true"
npm run ui:test:admin
```

### Option 4: Run Specific Test File

```powershell
npx mocha --require ts-node/register tests/ui/admin-comprehensive.spec.ts -r ts-node/esm --timeout 600000
```

## Test Flow

The comprehensive test suite (`admin-comprehensive.spec.ts`) follows this flow:

1. **Authentication Flow**
   - Navigates to login page
   - Clicks "Sign in with Cognito"
   - Enters email (`admin@test.com`)
   - Enters password (`Admin@123`)
   - Clicks Sign In
   - **⏸️ PAUSES for manual verification code entry** (if MFA is enabled)
   - Waits for redirect back to application
   - Verifies successful login

2. **Dashboard Tests**
   - Verifies dashboard loads
   - Checks user information display
   - Verifies welcome message

3. **Users Management Tests**
   - Navigates to Users page
   - Tests search functionality
   - Tests user details view

4. **Audit Log Tests**
   - Navigates to Audit Log page
   - Verifies audit events display
   - Tests event type filtering

5. **Navigation Tests**
   - Tests navigation between different pages
   - Verifies URL changes

## Manual Verification Code Entry

When the test reaches the verification code step, it will:

1. **Pause execution** and display a message in the console
2. **Wait up to 5 minutes** for you to:
   - Check your email/SMS for the verification code
   - Enter the code in the browser
   - Click the Verify/Submit button
3. **Automatically continue** once verification is complete

### What to Do When Test Pauses

```
========================================
⏸️  PAUSED FOR MANUAL VERIFICATION CODE
========================================
Please manually enter the verification code in the browser.
Waiting up to 300 seconds for you to complete verification...
========================================
```

1. **Look at the browser window** (if `HEADFUL=true`)
2. **Check your email or SMS** for the verification code
3. **Enter the code** in the verification input field
4. **Click the Verify/Submit button**
5. **Wait** - the test will automatically detect completion and continue

## Environment Variables

You can customize test behavior with environment variables:

```powershell
# Set base URL (default: http://localhost:5173)
$env:WEB_BASE_URL="http://localhost:5173"

# Enable visible browser (default: headless)
$env:HEADFUL="true"

# Set custom timeout (default: 300 seconds for verification)
# This is handled in the test code
```

## Test Structure

```
tests/ui/
├── admin-comprehensive.spec.ts    # Main comprehensive test suite
├── page-objects/
│   ├── CognitoLoginPage.ts        # AWS Cognito login page handling
│   ├── LoginPage.ts               # Application login page
│   ├── DashboardPage.ts          # Dashboard page
│   ├── UsersPage.ts              # Users management page
│   └── AuditPage.ts              # Audit log page
├── helpers/
│   ├── test-base.ts              # WebDriver setup and utilities
│   └── test-data.ts              # Test credentials and data
└── SELENIUM_TESTING_GUIDE.md     # This file
```

## Troubleshooting

### Test Fails at Login

- **Check backend is running**: Ensure auth backend is on `http://localhost:8080`
- **Check frontend is running**: Ensure dev server is on `http://localhost:5173`
- **Verify credentials**: Check that `admin@test.com` / `Admin@123` are correct
- **Check Cognito configuration**: Verify Cognito settings in `src/lib/cognito.ts`

### Verification Code Not Appearing

- **Check email/SMS**: The code may be delayed
- **Check spam folder**: Verification emails sometimes go to spam
- **Increase timeout**: The test waits 5 minutes by default
- **Check browser console**: Look for any JavaScript errors

### Test Times Out

- **Increase timeout**: Edit `admin-comprehensive.spec.ts` and change timeout values
- **Check network**: Ensure stable internet connection for Cognito
- **Run with visible browser**: Set `HEADFUL=true` to see what's happening

### Element Not Found Errors

- **Wait for page load**: Some pages take time to load
- **Check selectors**: Page structure may have changed
- **Run with visible browser**: Use `HEADFUL=true` to debug

## Best Practices

1. **Run tests in visible mode first**: Use `HEADFUL=true` to verify everything works
2. **Check console output**: The tests log detailed information about each step
3. **Keep browser open**: Don't close the browser during verification code entry
4. **One test at a time**: Don't run multiple test instances simultaneously
5. **Clean state**: Clear browser cache if tests behave unexpectedly

## Test Coverage

The comprehensive test suite covers:

- ✅ Full authentication flow with Cognito
- ✅ Manual verification code handling
- ✅ Dashboard functionality
- ✅ Users management
- ✅ Audit log viewing
- ✅ Navigation between pages
- ✅ User information display

## Next Steps

After running the tests successfully, you can:

1. **Extend test coverage**: Add more test cases for other features
2. **Add more page objects**: Create page objects for other pages (Bookings, Leave, etc.)
3. **Integrate with CI/CD**: Add these tests to your CI/CD pipeline
4. **Add screenshots**: Capture screenshots on test failures
5. **Add video recording**: Record test execution for debugging

## Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Run with `HEADFUL=true` to see what's happening in the browser
3. Check that all prerequisites are met
4. Verify backend and frontend services are running
5. Review the test code in `admin-comprehensive.spec.ts`

