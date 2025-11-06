# Combined Allure Test Report

This directory contains the combined Allure test reports for both backend and frontend tests.

## Structure

- `allure-results/` - Combined test results from backend and frontend
- `allure-report/` - Generated HTML report (view this in your browser)

## Current Status

### Combined Test Results
- **Total**: 70 tests
- **Passed**: 67
- **Failed**: 0
- **Broken**: 3
- **Skipped**: 0

### Backend Tests (auth-backend)
- **Total**: 62 tests
- **Passed**: 62
- **Failed**: 0
- **Broken**: 0
- **Skipped**: 0

### Frontend Tests (admin-web)
- **Total**: 8 tests
- **Passed**: 5
- **Failed**: 0
- **Broken**: 3
- **Skipped**: 0

**Test Suites:**
- User Role Management: 2 tests (broken)
- Audit Log: 1 test (broken)
- Login tests: (included in total)

## How to Generate/Update the Report

1. **Backend Tests**: Results are copied from `auth-backend/target/allure-results/`
2. **Frontend Tests**: Run frontend tests with Allure reporter:
   ```bash
   cd admin-web
   npm run ui:test  # This uses allure-mocha reporter
   ```
3. **Combine Results**: Copy frontend results to `combined-allure/allure-results/`
4. **Generate Report**: 
   ```bash
   allure generate combined-allure/allure-results -o combined-allure/allure-report --clean
   ```
5. **View Report**:
   ```bash
   allure open combined-allure/allure-report
   ```

## Viewing the Report

The report is available at `combined-allure/allure-report/index.html`

You can also open it using:
```bash
allure open combined-allure/allure-report
```

This will start a local server and open the report in your browser automatically.

