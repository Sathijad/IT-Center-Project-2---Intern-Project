# Allure Testing Report Setup

## Overview
This project now uses Allure Test Framework to generate comprehensive test reports for both backend (Spring Boot) and frontend (Mocha/Selenium) tests, with the ability to generate combined reports.

## Installation

Allure CLI has been installed globally:
```bash
npm install -g allure-commandline
allure --version  # Should show 2.34.1 or later
```

## Project Structure

### Backend (Spring Boot + JUnit5)
- **Location**: `auth-backend/`
- **Allure Dependency**: `allure-junit5` version 2.21.0
- **Results Directory**: `auth-backend/target/allure-results/`
- **Report Location**: `auth-backend/target/allure-report/`

### Frontend (Mocha + Selenium)
- **Location**: `admin-web/`
- **Allure Reporter**: `allure-mocha` version 3.0.0
- **Results Directory**: `admin-web/allure-results/`

### Combined Reports
- **Merged Results**: `all-results/`
- **Combined Report**: `combined-report/`

## Running Tests and Generating Reports

### Option 1: Run Everything at Once (Recommended)
From the root directory:
```bash
npm run report:both
```
This command will:
1. Run backend tests (`mvn clean test`)
2. Run frontend tests (`npm run ui:test`)
3. Clean previous results
4. Merge results from both backends
5. Generate combined Allure report
6. Open the report in browser

### Option 2: Run Tests Separately

#### Backend Only
```bash
npm run test:backend
# Generate report
cd auth-backend
allure generate target/allure-results --clean -o target/allure-report
allure open target/allure-report
```

#### Frontend Only
```bash
npm run test:frontend
# Generate report
cd admin-web
allure generate allure-results --clean -o allure-report
allure open allure-report
```

### Option 3: Generate Combined Report Manually

1. Run both test suites:
   ```bash
   npm run test:backend
   npm run test:frontend
   ```

2. Clean previous results:
   ```bash
   npm run allure:clean
   ```

3. Merge results:
   ```bash
   npm run allure:merge
   ```

4. Generate combined report:
   ```bash
   npm run allure:report
   ```

5. Open report:
   ```bash
   npm run allure:open
   ```

## Configuration Details

### Backend (pom.xml)
- Added `allure-junit5` dependency
- Configured `maven-surefire-plugin` with Allure results directory
- Added `allure-maven` plugin for convenience

### Frontend (package.json)
- Added `allure-mocha` reporter
- Updated test scripts to use `--reporter allure-mocha`
- Both `ui:test` and `e2e:test` commands now generate Allure results

## Test Results Location

### Backend
- **Results**: `auth-backend/target/allure-results/`
- **Report**: `auth-backend/target/allure-report/index.html`

### Frontend
- **Results**: `admin-web/allure-results/`
- **Report**: `admin-web/allure-report/index.html` (if generated separately)

### Combined
- **Merged Results**: `all-results/`
- **Combined Report**: `combined-report/index.html`

## Viewing Reports

### Via Command Line
```bash
allure open combined-report
```

### Via Browser
Navigate to:
- Backend only: `auth-backend/target/allure-report/index.html`
- Frontend only: `admin-web/allure-report/index.html` (if generated)
- Combined: `combined-report/index.html`

## NPM Scripts Available

| Script | Description |
|--------|-------------|
| `test:backend` | Run backend tests (Maven) |
| `test:frontend` | Run frontend UI tests (Mocha) |
| `allure:clean` | Clean previous merged results and reports |
| `allure:merge` | Merge backend and frontend Allure results |
| `allure:report` | Generate combined Allure report |
| `allure:open` | Open combined Allure report in browser |
| `report:both` | Run all tests, merge, generate, and open report |

## Notes

1. **Path Handling**: Scripts are configured to handle paths with spaces (e.g., "IT Center Project 2").

2. **Backend Tests**: Some backend tests may fail (as seen in initial run), but Allure will still generate reports from successful test executions.

3. **Frontend Tests**: Frontend tests use Selenium WebDriver and may require Chrome/Chromium to be installed. Tests run headless by default unless `HEADFUL=true` is set.

4. **Results Persistence**: Allure results are JSON files that can be archived and used to regenerate reports later.

5. **CI/CD Integration**: The Allure results can be uploaded as artifacts in CI/CD pipelines for later report generation.

## Troubleshooting

### No Allure Results Produced
- **Backend**: Ensure Maven tests ran successfully and check `auth-backend/target/allure-results/` exists
- **Frontend**: Ensure Mocha tests completed and check `admin-web/allure-results/` exists

### Empty Combined Report
- Verify both `auth-backend/target/allure-results/` and `admin-web/allure-results/` contain JSON result files
- Run `npm run allure:merge` again to ensure files are copied

### Path Issues
- If you encounter path-related errors, ensure the workspace path doesn't have special characters that need escaping
- The scripts now properly quote paths with spaces

## Next Steps

1. Add Allure annotations to tests for better categorization:
   - `@Epic`, `@Feature`, `@Story` for organization
   - `@Severity` for priority
   - `@Description` for documentation

2. Configure screenshot attachments for failed frontend tests

3. Set up CI/CD integration to automatically generate and publish reports

