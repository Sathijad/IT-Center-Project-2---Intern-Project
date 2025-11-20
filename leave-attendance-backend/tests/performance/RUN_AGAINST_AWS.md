# Running k6 Performance Tests Against AWS API

Since your Phase 2 API is deployed on AWS, here's what you need to do:

## Step 1: Get Your AWS API Gateway URL

Your API Gateway URL should look like:
```
https://<api-id>.execute-api.ap-southeast-2.amazonaws.com
```

**Default URL** (from frontend config):
```
https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com
```

**To find your actual URL:**
1. Check AWS Console → API Gateway → Your API → Stages
2. Or check your Serverless deployment output
3. Or check your frontend `.env` file

## Step 2: Get Authentication Token

You need a JWT token from AWS Cognito to test authenticated endpoints.

### Option A: Using Helper Script

```powershell
cd leave-attendance-backend/tests/performance/utils
npm install
node get-token.js user@example.com your-password
```

Copy the `Access Token` from the output.

### Option B: Using AWS CLI

```powershell
aws cognito-idp initiate-auth `
  --client-id 3rdnl5ind8guti89jrbob85r4i `
  --auth-flow USER_PASSWORD_AUTH `
  --auth-parameters USERNAME=user@example.com,PASSWORD=your-password `
  --region ap-southeast-2
```

Extract `AccessToken` from the JSON response.

## Step 3: Run Performance Test Against AWS

```powershell
cd leave-attendance-backend/tests/performance

# Set your AWS API URL
$env:API_BASE_URL="https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com"

# Set your authentication token
$env:ACCESS_TOKEN="your-access-token-here"

# Optional: Set admin token (for admin endpoints)
$env:ADMIN_TOKEN="admin-access-token-here"

# Run comprehensive test with Allure integration
$env:Path += ";$env:USERPROFILE\k6"
k6 run phase2-comprehensive-test.js --out json=aws-performance-result.json
```

**Or use npm script:**
```powershell
cd leave-attendance-backend

$env:API_BASE_URL="https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com"
$env:ACCESS_TOKEN="your-token-here"

npm run test:perf:allure
```

## Step 4: Convert Results to Allure

```powershell
cd leave-attendance-backend/tests/performance

# Convert the latest result
$latestJson = Get-ChildItem -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
node k6-to-allure.js $latestJson.Name
```

## Step 5: Generate Allure Report

```powershell
cd leave-attendance-backend
npm run allure:generate
npm run allure:open
```

## Expected Results

When running against AWS, you should see **8-9 test cases** in Allure:

1. ✅ Health Check
2. ✅ Get Leave Balance
3. ✅ List Leave Requests
4. ✅ Create Leave Request
5. ✅ Update Leave Request
6. ✅ List Attendance Logs
7. ✅ Clock In
8. ✅ Clock Out
9. ✅ Leave Summary Report

## Quick Command Summary

```powershell
# 1. Get token
cd leave-attendance-backend/tests/performance/utils
node get-token.js user@example.com password

# 2. Run test (copy token from step 1)
cd ..
$env:API_BASE_URL="https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com"
$env:ACCESS_TOKEN="paste-token-here"
$env:Path += ";$env:USERPROFILE\k6"
k6 run phase2-comprehensive-test.js --out json=aws-result.json

# 3. Convert to Allure
node k6-to-allure.js aws-result.json

# 4. Generate report
cd ..
npm run allure:generate
npm run allure:open
```

## Troubleshooting

### Issue: 401 Unauthorized
- Token expired (Cognito tokens expire after 1 hour)
- Regenerate token
- Verify token is correct

### Issue: Connection timeout
- Check API Gateway URL is correct
- Verify API Gateway is deployed and accessible
- Check network connectivity

### Issue: 403 Forbidden
- User doesn't have required permissions
- Use admin token for admin endpoints
- Check Cognito user roles

### Issue: No test cases created
- Verify comprehensive test ran successfully
- Check JSON result file exists
- Ensure custom metrics are present in JSON

## Notes

- **Token Expiration**: Cognito tokens expire after 1 hour. Regenerate if needed.
- **Rate Limiting**: AWS API Gateway may have rate limits. Adjust test load accordingly.
- **Costs**: Running performance tests against AWS may incur costs. Monitor usage.
- **Environment**: Make sure you're testing against the correct environment (dev/stg/prd).

---

**Ready to test?** Follow the steps above to get comprehensive test results with multiple test cases in Allure!


