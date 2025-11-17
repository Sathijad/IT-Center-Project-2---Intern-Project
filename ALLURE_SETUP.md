# Allure Test Reporting Setup

This document explains how to set up and use Allure test reporting for all projects in the IT Center Phase 2 system.

## 📋 Overview

Allure reports are configured for:
- **Backend**: Jest unit tests (`leave-attendance-backend`)
- **Frontend A11y**: Jest accessibility tests (`admin-web`)
- **Frontend E2E**: Mocha/Selenium UI automation tests (`admin-web`)
- **Mobile**: Appium/Mocha mobile automation tests (`mobile-app`)

## 🎯 Architecture Decision

**Separate Reports per Project** (Recommended)
- Each project generates its own Allure report
- Reports can be viewed individually or aggregated
- Easier to maintain and debug
- Clear separation of concerns

## 🚀 Quick Start

### 1. Install Allure Commandline (One-time setup)

**Windows (PowerShell):**
```powershell
# Using Scoop (recommended)
scoop install allure

# Or using Chocolatey
choco install allure-commandline

# Or download from: https://github.com/allure-framework/allure2/releases
```

**macOS:**
```bash
brew install allure
```

**Linux:**
```bash
# Download and install from: https://github.com/allure-framework/allure2/releases
# Or use package manager
```

### 2. Install Dependencies

```bash
# Backend
cd leave-attendance-backend
npm install

# Frontend
cd admin-web
npm install

# Mobile
cd mobile-app
npm install
```

## 📊 Running Tests with Allure

### Backend (Jest)

```bash
cd leave-attendance-backend

# Run tests with Allure
npm run test:allure

# Generate report
npm run allure:generate

# Open report
npm run allure:open

# Or serve directly (no generation needed)
npm run allure:serve
```

### Frontend - Accessibility Tests (Jest)

```bash
cd admin-web

# Run a11y tests with Allure
npm run a11y:test:allure

# Generate report
npm run allure:generate

# Open report
npm run allure:open
```

### Frontend - E2E Tests (Mocha/Selenium)

```bash
cd admin-web

# Run E2E tests with Allure
npm run e2e:test:allure

# Generate report
npm run allure:generate

# Open report
npm run allure:open
```

### Mobile (Appium/Mocha)

```bash
cd mobile-app

# Start Appium server (in separate terminal)
npm run appium:start

# Run tests with Allure
npm run mobile:test

# Generate report
npm run allure:generate

# Open report
npm run allure:open
```

## 🔗 Aggregated Reports (All Projects)

### Option 1: Run All Tests and Aggregate

```bash
# From root directory
npm run test:all:allure
```

This will:
1. Run backend tests with Allure
2. Run frontend a11y tests with Allure
3. Run frontend E2E tests with Allure
4. Run mobile tests with Allure
5. Aggregate all results into a single report

### Option 2: Aggregate Existing Results

If you've already run tests in each project:

```bash
# From root directory
npm run allure:aggregate

# Open aggregated report
npm run allure:aggregate:open
```

### Option 3: Serve Aggregated Results (Live)

```bash
npm run allure:aggregate:serve
```

## 📁 Directory Structure

```
IT Center Project 2/
├── leave-attendance-backend/
│   ├── allure-results/          # Backend test results
│   └── allure-report/           # Backend generated report
├── admin-web/
│   ├── allure-results/          # Frontend test results (a11y + E2E)
│   └── allure-report/           # Frontend generated report
├── mobile-app/
│   ├── allure-results/          # Mobile test results
│   └── allure-report/           # Mobile generated report
├── allure-results-aggregated/   # Aggregated results (root)
└── allure-report-aggregated/    # Aggregated report (root)
```

## 🎨 Allure Report Features

### What You'll See:

1. **Overview Dashboard**
   - Total tests, passed, failed, skipped
   - Duration trends
   - Test execution timeline

2. **Test Suites**
   - Grouped by test files/suites
   - Status indicators
   - Duration per suite

3. **Test Cases**
   - Detailed test steps
   - Screenshots (for E2E tests)
   - Error messages and stack traces
   - Attachments (logs, videos, etc.)

4. **Graphs & Trends**
   - Test execution history
   - Duration trends
   - Status breakdown

5. **Categories**
   - Grouped by test type (Backend, Frontend, Mobile)
   - Custom categories for test types

## 🔧 Configuration Details

### Backend (Jest)
- **Reporter**: `jest-allure2-reporter`
- **Results Dir**: `leave-attendance-backend/allure-results`
- **Config**: `package.json` → `jest.reporters`

### Frontend A11y (Jest)
- **Reporter**: `jest-allure2-reporter`
- **Results Dir**: `admin-web/allure-results`
- **Config**: `jest.config.cjs` → `reporters`

### Frontend E2E (Mocha)
- **Reporter**: `mocha-allure-reporter`
- **Results Dir**: `admin-web/allure-results`
- **Config**: Command-line flag `--reporter mocha-allure-reporter`

### Mobile (Mocha)
- **Reporter**: `mocha-allure-reporter`
- **Results Dir**: `mobile-app/allure-results`
- **Config**: Command-line flag `--reporter mocha-allure-reporter`

## 📝 Best Practices

1. **Run tests before generating reports**
   ```bash
   npm run test:allure  # or specific test command
   npm run allure:generate
   npm run allure:open
   ```

2. **Clean results before new test run**
   - Allure automatically cleans when using `--clean` flag
   - Or manually: `rm -rf allure-results/*`

3. **CI/CD Integration**
   - Generate reports in CI pipeline
   - Archive `allure-results` directory
   - Publish `allure-report` as artifact

4. **Screenshots for E2E Tests**
   - Screenshots are automatically attached for failed tests
   - Configure in your test files using Allure API

## 🐛 Troubleshooting

### Issue: "allure: command not found"
**Solution**: Install Allure commandline (see Quick Start section)

### Issue: No results in report
**Solution**: 
- Ensure tests ran with Allure reporter
- Check `allure-results` directory exists and has files
- Verify reporter configuration

### Issue: Aggregation shows no results
**Solution**:
- Run tests in each project first
- Check that `allure-results` directories exist in each project
- Verify aggregation script paths are correct

### Issue: Mocha tests not generating Allure results
**Solution**:
- Ensure `mocha-allure-reporter` is installed
- Check `--reporter mocha-allure-reporter` flag is present
- Verify `ALLURE_RESULTS_DIR` environment variable (defaults to `allure-results`)

## 📚 Additional Resources

- [Allure Framework Documentation](https://docs.qameta.io/allure/)
- [Jest Allure Reporter](https://www.npmjs.com/package/jest-allure2-reporter)
- [Mocha Allure Reporter](https://www.npmjs.com/package/mocha-allure-reporter)

## 🎯 Next Steps

1. Install Allure commandline
2. Run tests with Allure in each project
3. Generate and view individual reports
4. Try aggregated report for unified view
5. Integrate into CI/CD pipeline

---

**Note**: Allure reports are generated locally. For CI/CD, configure your pipeline to generate and publish reports as artifacts.

