# Performance Testing with k6

This directory contains k6 performance test scripts for the IT Center project.

## Prerequisites

1. Install [k6](https://k6.io/docs/getting-started/installation/)
   - Windows: `choco install k6` or download from [k6.io](https://k6.io/docs/getting-started/installation/)
   - macOS: `brew install k6`
   - Linux: Follow [official installation guide](https://k6.io/docs/getting-started/installation/)

2. Verify installation:
   ```bash
   k6 version
   ```

## Phase 4 Performance Tests

### Overview

The `phase4.js` test suite covers all Phase 4 endpoints:
- Schedules CRUD operations
- Tasks CRUD operations
- Task comments
- Availability checks
- Filtered queries

### Test Configuration

- **Target Load**: 500 VUs (Virtual Users)
- **Duration**: ~7.5 minutes total
- **Performance Targets**:
  - p95 latency < 350ms
  - Error rate < 1%
  - All endpoint-specific thresholds < 350ms

### Running the Tests

#### Basic Run

```bash
cd tests/perf
k6 run phase4.js
```

#### With Environment Variables

```bash
# Set base URL and authentication token
k6 run \
  -e BASE_URL=http://localhost:5000 \
  -e JWT_TOKEN=your-jwt-token-here \
  -e TEST_USER_ID=1 \
  -e TEST_ASSIGNEE_ID=2 \
  phase4.js
```

#### Production-like Testing

```bash
k6 run \
  -e BASE_URL=https://api.itcenter.com \
  -e JWT_TOKEN=your-production-token \
  -e TEST_USER_ID=1 \
  -e TEST_ASSIGNEE_ID=2 \
  phase4.js
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `http://localhost:5000` |
| `JWT_TOKEN` or `AUTH_TOKEN` | JWT authentication token | (required) |
| `TEST_USER_ID` | User ID for test operations | `1` |
| `TEST_ASSIGNEE_ID` | Assignee ID for task creation | `2` |

### Getting a JWT Token

You need a valid JWT token from AWS Cognito to run the tests. Options:

1. **From Admin Web Portal**:
   - Login to the admin portal
   - Open browser DevTools → Application → Local Storage
   - Copy the `idToken` value

2. **From Mobile App**:
   - Login via the mobile app
   - Extract token from secure storage

3. **Using Cognito CLI**:
   ```bash
   aws cognito-idp initiate-auth \
     --auth-flow USER_PASSWORD_AUTH \
     --client-id YOUR_CLIENT_ID \
     --auth-parameters USERNAME=admin,PASSWORD=your-password \
     --region ap-southeast-2
   ```

### Test Scenarios

The test suite includes:

1. **Health Check** - Verify service availability
2. **List Schedules** - GET `/api/v1/schedules`
3. **Create Schedule** - POST `/api/v1/schedules` (Admin only)
4. **Update Schedule** - PATCH `/api/v1/schedules/{id}`
5. **List Tasks** - GET `/api/v1/tasks`
6. **Create Task** - POST `/api/v1/tasks`
7. **Update Task** - PATCH `/api/v1/tasks/{id}`
8. **Add Task Comment** - POST `/api/v1/tasks/{id}/comments`
9. **Get Availability** - GET `/api/v1/availability`
10. **Filtered Queries** - Tasks and schedules with filters

### Output Files

After running, k6 generates:

- `phase4-perf-results.json` - Complete test results
- `phase4-summary.json` - Summary metrics
- Console output with real-time metrics

### Interpreting Results

#### Key Metrics

- **http_req_duration**: Overall request latency
- **http_req_failed**: Failed request rate (should be < 1%)
- **errors**: Custom error rate (should be < 1%)
- **schedule_create_time**: Schedule creation latency
- **task_create_time**: Task creation latency
- **availability_time**: Availability query latency

#### Thresholds

All thresholds must pass:
- ✅ `http_req_duration: p(95) < 350ms`
- ✅ `http_req_failed: rate < 0.01`
- ✅ `errors: rate < 0.01`

### Customizing Load

To modify the load pattern, edit the `stages` in `phase4.js`:

```javascript
stages: [
  { duration: '1m', target: 100 },   // Ramp up
  { duration: '2m', target: 300 },   // Increase load
  { duration: '3m', target: 500 },   // Peak load
  { duration: '1m', target: 300 },   // Ramp down
  { duration: '30s', target: 0 },    // Complete
],
```

### Troubleshooting

#### Authentication Errors (401)

- Verify JWT token is valid and not expired
- Ensure token has required roles (ADMIN for schedule creation)
- Check token format: `Bearer <token>`

#### Connection Errors

- Verify `BASE_URL` is correct
- Check if backend service is running
- Verify network connectivity

#### High Error Rates

- Check backend logs for errors
- Verify database connectivity
- Check if test data (user IDs) exists in database

#### Performance Issues

- Monitor backend resource usage (CPU, memory, database)
- Check database query performance
- Review backend logs for slow queries

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run k6 Performance Tests
  run: |
    k6 run \
      -e BASE_URL=${{ secrets.API_BASE_URL }} \
      -e JWT_TOKEN=${{ secrets.TEST_JWT_TOKEN }} \
      tests/perf/phase4.js
```

### Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)

