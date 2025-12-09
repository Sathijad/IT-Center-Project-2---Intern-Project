# Phase 6 Selenium UI Testing - Implementation Summary

## Overview

Comprehensive Selenium UI automation tests have been implemented for Phase 6 Performance & Training Module features. The tests use the Page Object Model pattern for maintainability and follow existing test patterns in the codebase.

## Files Created

### Page Objects
1. **`page-objects/KpiReportsPage.ts`**
   - Methods for interacting with the KPI reports page
   - Filtering (user ID, team ID, KPI code, time range)
   - View switching (snapshot, time series)

2. **`page-objects/KpiTargetsPage.ts`**
   - Methods for creating KPI targets
   - Creating new KPIs
   - Form interactions and validation

3. **`page-objects/KpiActualsPage.ts`**
   - Methods for recording KPI actual values
   - Manual entry forms

4. **`page-objects/KpiImportPage.ts`**
   - Methods for CSV file upload
   - Import job status tracking

5. **`page-objects/TrainingCoursesPage.ts`**
   - Methods for managing training courses
   - CRUD operations, search

6. **`page-objects/TrainingAssignmentsPage.ts`**
   - Methods for assigning training
   - Notification sending

### Helpers
7. **`helpers/auth-helper.ts`**
   - Cognito authentication helper
   - Methods: `loginWithCredentials()`, `isAuthenticated()`, `logout()`, `setAuthToken()`
   - Handles: Full Cognito OAuth flow with email/password

### Test Files
8. **`phase6.spec.ts`**
   - Comprehensive test suite covering all Phase 6 features
   - 30+ test cases
   - Authentication, KPI management, Training management, End-to-end workflows

### Documentation
9. **`PHASE6_TESTING.md`**
   - Complete testing guide
   - Prerequisites and setup
   - Running instructions
   - Troubleshooting guide

10. **`PHASE6_SELENIUM_IMPLEMENTATION.md`**
    - This file - implementation summary

## Test Coverage

### ✅ Authentication
- Login with email/password through Cognito
- Token verification

### ✅ KPI Reports Page
- Page navigation and display
- User ID filter
- Team ID filter
- KPI code filter
- Time range filter
- Snapshot view
- Time series view
- Clear filters

### ✅ KPI Targets Page
- Page navigation
- Create target modal
- Create KPI modal
- Form filling (period type, dates, target value)
- KPI creation (code, name, description, unit, category)

### ✅ KPI Actuals Page
- Page navigation
- Record actual value modal
- Form filling (KPI selection, value, measurement date)

### ✅ KPI Import Page
- Page navigation
- File upload interface
- Import instructions display

### ✅ Training Courses Page
- Page navigation
- Create course modal
- Form filling (title, description, provider, modality, duration)
- Search functionality
- Edit course modal

### ✅ Training Assignments Page
- Page navigation
- Assign training modal
- Send notifications modal
- Form filling (course selection, assignee type, user/cohort ID, due date)
- Notification filters

### ✅ End-to-End Workflows
- Complete KPI workflow: create KPI → set target → record actual → view report
- Complete training workflow: create course → assign training

## Test Credentials

The tests use:
- **Email**: `admin@test.com`
- **Password**: `Admin@123`

## Running the Tests

### Quick Start

```bash
cd admin-web
npm run ui:test:phase6
```

### With Visible Browser

```bash
cd admin-web
HEADFUL=true npm run ui:test:phase6
```

### Custom Base URL

```bash
cd admin-web
WEB_BASE_URL=http://localhost:5173 npm run ui:test:phase6
```

## Prerequisites

1. Admin web app running on `http://localhost:5173`
2. Performance backend API running on `http://localhost:5167`
3. Auth backend running on `http://localhost:8080`
4. User `admin@test.com` with password `Admin@123` exists in Cognito
5. Chrome browser installed (latest version)
6. Node.js 18+

## Test Structure

```
tests/ui/
├── phase6.spec.ts                          # Main test file
├── page-objects/
│   ├── KpiReportsPage.ts                  # Reports page interactions
│   ├── KpiTargetsPage.ts                  # Targets page interactions
│   ├── KpiActualsPage.ts                  # Actuals page interactions
│   ├── KpiImportPage.ts                   # Import page interactions
│   ├── TrainingCoursesPage.ts             # Courses page interactions
│   └── TrainingAssignmentsPage.ts         # Assignments page interactions
├── helpers/
│   └── auth-helper.ts                     # Authentication utilities
├── PHASE6_TESTING.md                      # Testing guide
└── PHASE6_SELENIUM_IMPLEMENTATION.md      # This file
```

## Key Features

1. **Page Object Model**: Clean separation of page interactions
2. **Real Authentication**: Uses actual Cognito OAuth flow
3. **Comprehensive Coverage**: Tests all major Phase 6 features
4. **Error Handling**: Graceful handling of missing data
5. **Flexible**: Can run headless or with visible browser
6. **Well Documented**: Complete documentation for setup and usage

## Notes

- Tests use real backend APIs (not mocks)
- Some tests may skip if no data exists
- Tests automatically clean up (browser closes)
- Timeout is set to 120 seconds for slow networks
- Tests avoid creating actual data when possible (use cancel buttons)
- Screenshots are taken on authentication errors

## Next Steps

1. Ensure all services are running
2. Verify test user exists in Cognito
3. Run tests: `npm run ui:test:phase6`
4. Review test results
5. Fix any issues found

## Troubleshooting

See `PHASE6_TESTING.md` for detailed troubleshooting guide.

