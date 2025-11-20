# k6 Performance Testing - Quick Start

Get started with k6 performance testing in 5 minutes!

## Step 1: Install k6

**Windows:**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
# See https://k6.io/docs/getting-started/installation/
```

Verify installation:
```bash
k6 version
```

## Step 2: Get Authentication Token

### Option A: Using Helper Script (Recommended)

```bash
cd leave-attendance-backend/tests/performance/utils
npm install
node get-token.js user@example.com your-password
```

Copy the `Access Token` from the output.

### Option B: Manual (AWS CLI)

```bash
aws cognito-idp initiate-auth \
  --client-id 3rdnl5ind8guti89jrbob85r4i \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=your-password \
  --region ap-southeast-2
```

Extract `AccessToken` from the JSON response.

## Step 3: Set Environment Variables

**Windows PowerShell:**
```powershell
$env:API_BASE_URL="http://localhost:3000"
$env:ACCESS_TOKEN="your-access-token-here"
```

**Linux/macOS:**
```bash
export API_BASE_URL=http://localhost:3000
export ACCESS_TOKEN=your-access-token-here
```

## Step 4: Run Your First Test

### Smoke Test (Quick validation - 1 minute)

```bash
cd leave-attendance-backend/tests/performance
k6 run scenarios/smoke-test.js
```

### Load Test (Normal load - 14 minutes)

```bash
k6 run scenarios/load-test.js
```

### Using npm Scripts

```bash
cd leave-attendance-backend
npm run test:perf:smoke
```

## Step 5: Review Results

The test will output:
- ✅/❌ Pass/fail status for each check
- Response time metrics (avg, p95, p99)
- Error rates
- JSON report file: `phase2-performance-<timestamp>.json`

## Example Output

```
✓ leave balance status is 200
✓ list leave requests status is 200
✓ clock in status is 201 or 409

checks.........................: 95.00% ✓ 1900 ✗ 100
http_req_duration..............: avg=145ms p(95)=280ms p(99)=450ms
http_req_failed................: 0.50%
http_reqs......................: 2000    33.33/s

Thresholds:
  http_req_duration: p(95)<300: ✅ PASS
  errors: rate<0.01: ✅ PASS
```

## Next Steps

- Read the [Complete Guide](./K6_TESTING_GUIDE.md) for detailed documentation
- Try different scenarios: `stress-test.js`, `spike-test.js`
- Test against different environments (dev, staging)
- Customize test scenarios for your needs

## Troubleshooting

**401 Unauthorized errors:**
- Token expired (Cognito tokens expire after 1 hour)
- Regenerate token using Step 2
- Verify token is set: `echo $ACCESS_TOKEN`

**Connection errors:**
- Verify API is running: `curl http://localhost:3000/healthz`
- Check `API_BASE_URL` is correct

**High error rates:**
- Check API logs
- Reduce concurrent users
- Verify database connectivity

## Need Help?

See [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md) for comprehensive documentation.

