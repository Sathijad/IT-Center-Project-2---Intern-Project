# Selenium UI Automation Tests - Complete List

This document lists all available Selenium test files and how to run them individually with a **visible browser window**.

## 📋 Available Test Files

### 1. **Login Tests** (`login.spec.ts`)
- **Description**: Tests the authentication flow with Cognito login
- **Command**: `npm run ui:test:login`
- **What it tests**:
  - Login page display
  - Sign in with Cognito button
  - Token-based authentication bypass

### 2. **User Role Management Tests** (`users.roles.spec.ts`)
- **Description**: Tests user role assignment and management
- **Command**: `npm run ui:test:users`
- **What it tests**:
  - User search functionality
  - Role management modal
  - Role assignment/removal
  - Idempotent operations

### 3. **Audit Log Tests** (`audit.spec.ts`)
- **Description**: Tests audit log viewing and filtering
- **Command**: `npm run ui:test:audit`
- **What it tests**:
  - Audit log page navigation
  - Event viewing
  - User filtering
  - Role assignment/removal events

### 4. **Leave Management Tests** (`leave.spec.ts`)
- **Description**: Tests leave request functionality
- **Command**: `npm run ui:test:leave`
- **What it tests**:
  - Leave request creation
  - Leave request viewing
  - Leave approval workflow

### 5. **Attendance Tests** (`attendance.spec.ts`)
- **Description**: Tests attendance tracking functionality
- **Command**: `npm run ui:test:attendance`
- **What it tests**:
  - Attendance page navigation
  - Attendance recording
  - Attendance viewing

### 6. **Accessibility Tests** (`a11y.smoke.spec.ts`)
- **Description**: Tests accessibility compliance using axe-core
- **Command**: `npm run ui:test:a11y`
- **What it tests**:
  - Accessibility violations
  - Keyboard navigation
  - ARIA attributes
  - Color contrast

### 7. **Admin Comprehensive Tests** (`admin-comprehensive.spec.ts`)
- **Description**: Comprehensive admin portal tests with real Cognito login
- **Command**: `npm run ui:test:admin`
- **What it tests**:
  - Full authentication flow with real credentials
  - Manual verification code entry
  - Dashboard functionality
  - Users management
  - Audit log viewing
  - Navigation between pages

### 8. **Phase 3 Booking System Tests** (`phase3-booking.spec.ts`)
- **Description**: Complete Phase 3 booking system tests with real Cognito login
- **Command**: `npm run ui:test:phase3`
- **What it tests**:
  - Full authentication flow with real credentials (`admin@test.com` / `Admin@123`)
  - Manual verification code entry
  - **Employee Features**:
    - Book Room page (search, availability)
    - My Bookings page (view, cancel)
  - **Admin Features**:
    - Booking Rooms page
    - Booking Blackouts page
    - Admin Bookings page (with filters)
    - Booking Reports page
  - Navigation flow

## 🚀 How to Run Tests

### Run Individual Tests (Visible Browser)

All commands below will open a **visible Chrome browser window** so you can see what's happening:

```powershell
# Login tests
npm run ui:test:login

# User role management tests
npm run ui:test:users

# Audit log tests
npm run ui:test:audit

# Leave management tests
npm run ui:test:leave

# Attendance tests
npm run ui:test:attendance

# Accessibility tests
npm run ui:test:a11y

# Admin comprehensive tests (with real login)
npm run ui:test:admin

# Phase 3 booking system tests (with real login)
npm run ui:test:phase3
```

### Run All Tests

```powershell
# Run all tests (headless by default)
npm run ui:test

# Run all tests with visible browser
$env:HEADFUL="true"
npm run ui:test
```

## 📝 Test Details

### Tests Requiring Manual Verification

These tests will **pause** for you to enter a verification code:

1. **`ui:test:admin`** - Pauses for verification code during Cognito login
2. **`ui:test:phase3`** - Pauses for verification code during Cognito login

When these tests pause:
- Check your email/SMS for the verification code
- Enter the code in the browser window
- Click Verify/Submit
- The test will automatically continue

### Test Credentials

Tests that use real credentials:
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

These are configured in `tests/ui/helpers/test-data.ts`

## ⚙️ Configuration

### Change Browser Visibility

All individual test commands run with `HEADFUL=true` by default (visible browser).

To run in headless mode, modify the command or set:
```powershell
$env:HEADFUL="false"
```

### Change Timeout

Default timeout is **600 seconds (10 minutes)** for comprehensive tests.

To change timeout, modify the `--timeout` value in `package.json`.

### Change Base URL

Default URL is `http://localhost:5173`.

To change:
```powershell
$env:WEB_BASE_URL="http://your-url:port"
```

## 📊 Test Execution Order

Recommended order for running tests:

1. **Start with**: `ui:test:login` - Basic login flow
2. **Then**: `ui:test:users` - User management
3. **Then**: `ui:test:audit` - Audit log
4. **Then**: `ui:test:leave` - Leave management
5. **Then**: `ui:test:attendance` - Attendance
6. **Then**: `ui:test:a11y` - Accessibility
7. **Finally**: `ui:test:phase3` - Complete Phase 3 booking system (requires manual verification)

## 🔍 Troubleshooting

### Test Fails to Start

- Ensure backend services are running
- Check that frontend dev server is running on port 5173
- Verify Chrome browser is installed

### Browser Doesn't Open

- Check if `HEADFUL=true` is set
- Verify ChromeDriver is installed: `npm list chromedriver`
- Check for port conflicts

### Verification Code Not Appearing

- Check email/SMS for code
- Check spam folder
- Test waits up to 5 minutes for manual entry

### Element Not Found Errors

- Run with visible browser to see what's happening
- Check that pages are fully loaded
- Verify backend APIs are responding

## 📚 Related Documentation

- **Phase 3 Testing Guide**: `PHASE3_TESTING_GUIDE.md`
- **General Selenium Guide**: `SELENIUM_TESTING_GUIDE.md`
- **README**: `README.md`

