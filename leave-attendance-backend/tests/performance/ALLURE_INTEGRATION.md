# k6 to Allure Integration Guide

This guide explains how to integrate k6 performance test results into Allure reports.

## Overview

k6 performance test results can now be automatically converted to Allure XML format and included in your Allure test reports alongside Jest, Mocha, and other test results.

## Quick Start

### 1. Run k6 Test with Allure Integration

```powershell
cd leave-attendance-backend

# Set environment variables
$env:API_BASE_URL="http://localhost:3000"
$env:ACCESS_TOKEN="your-token-here"

# Run test and automatically convert to Allure
npm run test:perf:allure:smoke    # Quick smoke test
npm run test:perf:allure:load     # Load test
npm run test:perf:allure          # Comprehensive test
```

### 2. Generate Allure Report

```powershell
# Generate report (includes k6 results)
npm run allure:generate

# Open report in browser
npm run allure:open

# Or serve directly (live updates)
npm run allure:serve
```

## Manual Conversion

If you already have k6 JSON result files:

```powershell
cd leave-attendance-backend/tests/performance

# Convert a specific k6 JSON file to Allure
node k6-to-allure.js health-check-1234567890.json

# Or specify custom output directory
node k6-to-allure.js phase2-performance-1234567890.json ../allure-results
```

## Available Scripts

### k6 Test Scripts (Standard)
- `npm run test:perf` - Comprehensive test
- `npm run test:perf:smoke` - Smoke test
- `npm run test:perf:load` - Load test
- `npm run test:perf:stress` - Stress test
- `npm run test:perf:spike` - Spike test

### k6 Test Scripts (with Allure)
- `npm run test:perf:allure` - Comprehensive test + Allure conversion
- `npm run test:perf:allure:smoke` - Smoke test + Allure conversion
- `npm run test:perf:allure:load` - Load test + Allure conversion

### Allure Scripts
- `npm run allure:generate` - Generate Allure report
- `npm run allure:open` - Open Allure report in browser
- `npm run allure:serve` - Serve Allure report (live)

### Utility Scripts
- `npm run k6:to-allure <json-file>` - Convert k6 JSON to Allure format

## How It Works

1. **k6 Test Execution**: k6 runs the performance test and outputs JSON results
2. **Automatic Conversion**: The `run-k6-with-allure.js` script automatically:
   - Finds the latest k6 JSON result file
   - Converts it to Allure XML format using `k6-to-allure.js`
   - Saves to `allure-results/` directory
3. **Report Generation**: Allure generates a unified report including:
   - Jest unit test results
   - k6 performance test results
   - All other test results

## Allure Report Features

When viewing k6 results in Allure, you'll see:

### Test Case Information
- **Name**: "Performance Test Execution"
- **Status**: Passed/Failed based on thresholds
- **Duration**: Total test execution time
- **Framework**: k6
- **Type**: Performance test

### Detailed Metrics
- Total requests count
- Passed/Failed requests
- Error rate percentage
- Response time metrics (avg, min, max, p90, p95, p99)
- Threshold status (pass/fail)
- Custom metrics

### Attachments
- Original k6 JSON result file (as attachment)
- Environment properties

## Example Workflow

```powershell
# 1. Run k6 performance test with Allure integration
cd leave-attendance-backend
$env:API_BASE_URL="http://localhost:3000"
npm run test:perf:allure:smoke

# 2. Generate Allure report
npm run allure:generate

# 3. View report
npm run allure:open
```

## Aggregated Reports

k6 results are automatically included when generating aggregated reports:

```powershell
# From project root
npm run allure:aggregate
npm run allure:aggregate:open
```

This will include:
- Backend Jest tests
- **k6 Performance tests** ✅
- Frontend A11y tests
- Frontend E2E tests
- Mobile tests

## File Structure

```
leave-attendance-backend/
├── tests/performance/
│   ├── k6-to-allure.js              # Converter script
│   ├── run-k6-with-allure.js        # Runner with auto-conversion
│   ├── phase2-comprehensive-test.js # Main test script
│   ├── scenarios/                   # Test scenarios
│   └── *.json                       # k6 result files
├── allure-results/                  # Allure XML results (includes k6)
│   ├── *-testsuite.xml              # Allure test suite XML
│   └── environment.properties       # Environment info
└── allure-report/                   # Generated Allure report
```

## Troubleshooting

### Issue: "No k6 JSON result files found"

**Solution**: 
- Ensure k6 test completed successfully
- Check that test script outputs JSON (via `handleSummary`)
- Verify JSON files are in `tests/performance/` directory

### Issue: Allure report doesn't show k6 results

**Solution**:
- Verify `allure-results/` contains XML files
- Check that conversion ran successfully
- Regenerate report: `npm run allure:generate --clean`

### Issue: Conversion fails

**Solution**:
- Verify k6 JSON file is valid JSON
- Check file path is correct
- Ensure `uuid` package is installed: `npm install uuid`

## Customization

### Modify Allure XML Format

Edit `k6-to-allure.js` to customize:
- Test case names
- Descriptions
- Labels
- Attachments
- Status determination logic

### Add Custom Metrics

The converter automatically includes:
- HTTP request metrics
- Response time percentiles
- Error rates
- Threshold status

To add more metrics, modify the `description` section in `k6-to-allure.js`.

## Best Practices

1. **Run tests before generating reports**
   ```powershell
   npm run test:perf:allure:load
   npm run allure:generate
   ```

2. **Use descriptive test names**
   - k6 test scripts should have clear names
   - Results will appear in Allure with test script name

3. **Set appropriate thresholds**
   - Failed thresholds will show as failed tests in Allure
   - Helps identify performance issues quickly

4. **Include environment info**
   - Set `API_BASE_URL` environment variable
   - Environment properties are automatically captured

5. **Regular reporting**
   - Run performance tests regularly
   - Track trends over time in Allure

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run k6 Performance Tests
  run: |
    cd leave-attendance-backend
    npm run test:perf:allure:load
  
- name: Generate Allure Report
  run: |
    cd leave-attendance-backend
    npm run allure:generate
  
- name: Publish Allure Report
  uses: actions/upload-artifact@v3
  with:
    name: allure-report
    path: leave-attendance-backend/allure-report
```

## Additional Resources

- [Allure Framework Documentation](https://docs.qameta.io/allure/)
- [k6 Documentation](https://k6.io/docs/)
- [k6 Testing Guide](./K6_TESTING_GUIDE.md)
- [Allure Setup Guide](../../ALLURE_SETUP.md)

---

**Status**: ✅ Fully Integrated  
**Last Updated**: 2025-11-20

