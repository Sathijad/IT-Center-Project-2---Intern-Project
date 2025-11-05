# Performance Testing with k6

## Prerequisites

Install k6:
- Windows: `choco install k6`
- macOS: `brew install k6`
- Linux: See [k6 installation guide](https://k6.io/docs/getting-started/installation/)

## Running Tests

### Basic Load Test

```bash
# Set environment variables
export API_BASE_URL=http://localhost:3000
export ACCESS_TOKEN=<your-jwt-token>

# Run load test
k6 run tests/performance/attendance-load-test.js
```

### Custom Load Profile

Edit the `stages` in `attendance-load-test.js` to customize load pattern:

```javascript
stages: [
  { duration: '1m', target: 50 },   // Ramp up
  { duration: '3m', target: 100 },  // Sustained load
  { duration: '1m', target: 0 },    // Ramp down
]
```

### Target Environments

```bash
# Test against DEV
export API_BASE_URL=https://api-dev.itcenter.com/v2
k6 run tests/performance/attendance-load-test.js

# Test against STG
export API_BASE_URL=https://api-stg.itcenter.com/v2
k6 run tests/performance/attendance-load-test.js
```

## Expected Results

- **p95 latency**: < 300ms
- **Error rate**: < 1%
- **RPS**: Sustain 100 req/s

## Interpreting Results

The test outputs:
- Summary statistics (avg, p95, p99 response times)
- Threshold pass/fail status
- JSON report file

Review `attendance-load-test-report.json` for detailed metrics.

