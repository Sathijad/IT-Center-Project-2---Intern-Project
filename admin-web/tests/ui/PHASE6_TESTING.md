# Phase 6 Performance & Training UI Testing Guide

This document describes how to run Selenium UI automation tests for Phase 6 Performance & Training Module features.

## Prerequisites

1. **Node.js 18+** installed
2. **Chrome browser** installed (latest version)
3. **ChromeDriver** - automatically installed via npm dependencies
4. **Admin Web Application** running on `http://localhost:5173`
5. **Performance Backend API** running on `http://localhost:5167`
6. **Auth Backend** running on `http://localhost:8080` (for authentication)

## Test Credentials

The tests use the following credentials:
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

Make sure this user exists in your Cognito User Pool and has ADMIN role.

## Running the Tests

### Run Only Phase 6 Tests

```powershell
cd admin-web
npm run ui:test:phase6
```

### Run Tests in Headful Mode (See Browser)

**PowerShell:**
```powershell
cd admin-web
$env:HEADFUL="true"; npm run ui:test:phase6
```

**Bash/Linux/Mac:**
```bash
cd admin-web
HEADFUL=true npm run ui:test:phase6
```

### Run with Custom Base URL

**PowerShell:**
```powershell
cd admin-web
$env:WEB_BASE_URL="http://localhost:5173"; npm run ui:test:phase6
```

**Bash/Linux/Mac:**
```bash
cd admin-web
WEB_BASE_URL=http://localhost:5173 npm run ui:test:phase6
```

## Test Structure

### Page Objects

The tests use the Page Object Model pattern for maintainability:

- **KpiReportsPage** (`page-objects/KpiReportsPage.ts`)
  - Methods for viewing KPI reports
  - Filtering by user, team, KPI code, time range
  - Switching between snapshot and time series views

- **KpiTargetsPage** (`page-objects/KpiTargetsPage.ts`)
  - Methods for creating KPI targets
  - Creating new KPIs
  - Setting period types and target values

- **KpiActualsPage** (`page-objects/KpiActualsPage.ts`)
  - Methods for recording KPI actual values
  - Manual entry of measured values

- **KpiImportPage** (`page-objects/KpiImportPage.ts`)
  - Methods for CSV file upload
  - Import job status tracking

- **TrainingCoursesPage** (`page-objects/TrainingCoursesPage.ts`)
  - Methods for managing training courses
  - Creating, editing, searching courses

- **TrainingAssignmentsPage** (`page-objects/TrainingAssignmentsPage.ts`)
  - Methods for assigning training
  - Sending notifications

- **AuthHelper** (`helpers/auth-helper.ts`)
  - Handles Cognito authentication flow
  - Login with email/password

### Test Suites

The test file `phase6.spec.ts` contains the following test suites:

1. **Authentication**
   - Login with email and password

2. **KPI Reports Page**
   - Page navigation and display
   - Filtering (user ID, team ID, KPI code, time range)
   - View switching (snapshot, time series)
   - Clear filters

3. **KPI Targets Page**
   - Page navigation
   - Create target modal
   - Create KPI modal
   - Form filling and validation

4. **KPI Actuals Page**
   - Page navigation
   - Record actual value modal
   - Form filling

5. **KPI Import Page**
   - Page navigation
   - File upload interface
   - Import instructions

6. **Training Courses Page**
   - Page navigation
   - Create course modal
   - Search functionality
   - Form filling

7. **Training Assignments Page**
   - Page navigation
   - Assign training modal
   - Send notifications modal
   - Form filling

8. **End-to-End Workflows**
   - Complete KPI workflow (create -> target -> actual -> report)
   - Complete training workflow (create course -> assign)

## Test Coverage

The tests cover:

✅ Authentication flow with Cognito  
✅ KPI Reports page display and filters  
✅ KPI Targets creation and management  
✅ KPI Actuals recording  
✅ KPI Import page interface  
✅ Training Courses CRUD operations  
✅ Training Assignments and notifications  
✅ View switching and filtering  
✅ Modal interactions  
✅ Form validation  
✅ End-to-end workflows  

## Troubleshooting

### Tests Fail with "Element not found"

- Ensure the admin web app is running on `http://localhost:5173`
- Check that the performance backend is running on `http://localhost:5167`
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
- Verify database connection for performance backend

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
- Can be adjusted in `phase6.spec.ts` or via mocha `--timeout` flag

## CI/CD Integration

For CI/CD pipelines:

```bash
# Install dependencies
npm install

# Run tests headless
npm run ui:test:phase6
```

Ensure Chrome/Chromium is available in the CI environment.

## Notes

- Tests use real Cognito authentication (not mocks)
- Tests interact with real backend APIs
- Some tests may be skipped if no data exists
- Tests clean up after themselves (browser closes automatically)
- Tests avoid creating actual data when possible (use cancel buttons)

