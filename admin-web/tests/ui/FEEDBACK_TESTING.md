# Phase 7 Feedback UI Testing Guide

This document describes how to run Selenium UI automation tests for Phase 7 Feedback & Issue Reporting features.

## Prerequisites

1. **Node.js 18+** installed
2. **Chrome browser** installed (latest version)
3. **ChromeDriver** - automatically installed via npm dependencies
4. **Admin Web Application** running on `http://localhost:5173`
5. **Feedback Backend API** running on `http://localhost:8086`
6. **Auth Backend** running on `http://localhost:8080` (for authentication)

## Test Credentials

The tests use the following credentials:
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

Make sure this user exists in your Cognito User Pool and has ADMIN role.

## Running the Tests

### Run All UI Tests

```bash
cd admin-web
npm run ui:test
```

### Run Only Feedback Tests

```bash
cd admin-web
npm run ui:test:feedback
```

### Run Tests in Headful Mode (See Browser)

**PowerShell:**
```powershell
cd admin-web
$env:HEADFUL="true"; npm run ui:test:feedback
```

**Bash/Linux/Mac (or with cross-env):**
```bash
cd admin-web
HEADFUL=true npm run ui:test:feedback
```

### Run with Custom Base URL

**PowerShell:**
```powershell
cd admin-web
$env:WEB_BASE_URL="http://localhost:5173"; npm run ui:test:feedback
```

**Bash/Linux/Mac (or with cross-env):**
```bash
cd admin-web
WEB_BASE_URL=http://localhost:5173 npm run ui:test:feedback
```

### Run with Both Environment Variables

**PowerShell:**
```powershell
cd admin-web
$env:HEADFUL="true"; $env:WEB_BASE_URL="http://localhost:5173"; npm run ui:test:feedback
```

**Bash/Linux/Mac:**
```bash
cd admin-web
HEADFUL=true WEB_BASE_URL=http://localhost:5173 npm run ui:test:feedback
```

**Note:** The test script now uses `cross-env` which works on all platforms, but PowerShell syntax is shown above for clarity.

## Test Structure

### Page Objects

The tests use the Page Object Model pattern for maintainability:

- **FeedbackListPage** (`page-objects/FeedbackListPage.ts`)
  - Methods for interacting with the feedback list page
  - Filtering, searching, navigation

- **FeedbackDetailPage** (`page-objects/FeedbackDetailPage.ts`)
  - Methods for viewing and updating feedback details
  - Admin controls, messages, status updates

- **SubmitFeedbackPage** (`page-objects/SubmitFeedbackPage.ts`)
  - Methods for submitting new feedback
  - Form filling and validation

- **AuthHelper** (`helpers/auth-helper.ts`)
  - Handles Cognito authentication flow
  - Login with email/password

### Test Suites

The test file `feedback.spec.ts` contains the following test suites:

1. **Authentication**
   - Login with email and password

2. **Feedback List Page**
   - Page navigation and display
   - Filter functionality (status, priority, category, search)
   - Navigation to submit page
   - Export CSV (admin only)

3. **Submit Feedback Page**
   - Form display and validation
   - Submitting new feedback
   - Form cancellation

4. **Feedback Detail Page**
   - Viewing feedback details
   - Status and priority display
   - Admin controls (update, analyze, notify)
   - Adding messages

5. **End-to-End Workflow**
   - Complete workflow: create → view → update

## Test Coverage

The tests cover:

✅ Authentication flow with Cognito  
✅ Feedback list page display and filters  
✅ Submitting new feedback  
✅ Viewing feedback details  
✅ Updating feedback (admin)  
✅ Adding messages to feedback  
✅ Filtering and searching feedback  
✅ Navigation between pages  

## Troubleshooting

### Tests Fail with "Element not found"

- Ensure the admin web app is running on `http://localhost:5173`
- Check that the feedback backend is running on `http://localhost:8086`
- Verify the user credentials are correct
- Run in headful mode (`HEADFUL=true`) to see what's happening

### Authentication Fails

- Verify the user `admin@test.com` exists in Cognito
- Check that the user has ADMIN role
- Ensure Cognito configuration is correct in `src/lib/cognito.ts`
- Check network connectivity to Cognito

### Tests Timeout

- Increase timeout in test file if needed
- Check backend services are responding
- Verify database connection for feedback backend

### ChromeDriver Issues

- ChromeDriver is installed via npm, but if issues occur:
  - Update Chrome browser to latest version
  - Run `npm install` to reinstall chromedriver
  - Check ChromeDriver version matches Chrome version

## Configuration

### Environment Variables

- `WEB_BASE_URL`: Base URL for admin web app (default: `http://localhost:5173`)
- `HEADFUL`: Set to `true` to run tests with visible browser (default: `false`)

### Test Timeouts

- Default timeout: 120 seconds
- Can be adjusted in `feedback.spec.ts` or via mocha `--timeout` flag

## CI/CD Integration

For CI/CD pipelines:

```bash
# Install dependencies
npm install

# Run tests headless
npm run ui:test:feedback
```

Ensure Chrome/Chromium is available in the CI environment.

## Notes

- Tests use real Cognito authentication (not mocks)
- Tests interact with real backend APIs
- Some tests may be skipped if no feedback data exists
- Tests clean up after themselves (browser closes automatically)

