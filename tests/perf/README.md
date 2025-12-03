# Performance Testing with k6

This directory contains k6 performance test scripts for different phases of the IT Center project.

## Prerequisites

1. **Install k6**: Download from [k6.io](https://k6.io/docs/getting-started/installation/)
   - Windows: `choco install k6` or download from [releases](https://github.com/grafana/k6/releases)
   - Mac: `brew install k6`
   - Linux: Follow [official guide](https://k6.io/docs/getting-started/installation/)

2. **Verify installation**:
   ```powershell
   k6 version
   ```

## Phase 5 Events Performance Tests

### Test File
- `phase5.js` - Comprehensive performance tests for Events & Announcements API

### Phase 5 Requirements
- **Feed p95 latency**: < 300ms (critical requirement)
- **Error rate**: < 1%
- **Broadcast success**: > 98%

### Running Phase 5 Tests

#### Basic Run (Local)
```powershell
# Set environment variables
$env:EVENTS_API_BASE_URL = "http://localhost:8085"
$env:ADMIN_JWT_TOKEN = "your-admin-jwt-token-here"
$env:EMPLOYEE_JWT_TOKEN = "your-employee-jwt-token-here"

# Run the test
k6 run phase5.js
```

#### With Custom Load
```powershell
k6 run --vus 50 --duration 5m phase5.js
```

#### With Environment Variables
```powershell
k6 run -e EVENTS_API_BASE_URL=http://localhost:8085 -e ADMIN_JWT_TOKEN=your-token phase5.js
```

### Test Scenarios Covered

1. **Feed List** (`GET /api/v1/events`) - **Critical for p95 < 300ms requirement**
   - Tests pagination, filtering, ETag caching
   - Monitors response time specifically

2. **Event Detail** (`GET /api/v1/events/:id`)
   - Tests individual event retrieval

3. **Tag Search** (`GET /api/v1/tags`)
   - Tests tag library search

4. **Create Event** (`POST /api/v1/events`) - Admin only
   - Tests event creation with full payload

5. **Update Event** (`PATCH /api/v1/events/:id`) - Admin only
   - Tests event updates

6. **Tag Suggestions** (`POST /api/v1/events/tag-suggest`) - Admin only
   - Tests tag suggestion endpoint

7. **Moderate Event** (`POST /api/v1/events/:id/moderate`) - Admin only
   - Tests moderation workflow

8. **Broadcast Event** (`POST /api/v1/events/:id/broadcast`) - Admin only
   - Tests broadcast with idempotency key

9. **Audit Log** (`GET /api/v1/events/:id/audit`) - Admin only
   - Tests audit log retrieval

10. **ETag Caching** (`GET /api/v1/events` with `If-None-Match`)
    - Tests HTTP 304 Not Modified responses

### Test Configuration

The test uses a staged load pattern:
- **Ramp up**: 30 seconds to 50 VUs
- **Sustained load**: 2 minutes at 100 VUs
- **Ramp down**: 30 seconds to 0 VUs

### Thresholds

- `http_req_duration{name:feed_list}`: p95 < 300ms (Phase 5 requirement)
- `http_req_duration`: p95 < 500ms (overall)
- `errors`: rate < 0.01 (< 1%)
- `http_req_failed`: rate < 0.01 (< 1%)
- `feed_slow`: rate < 0.05 (< 5% of feed requests exceed 300ms)

### Output Files

After running, the test generates:
- `phase5-perf-results.json` - Full k6 metrics output
- `phase5-summary.json` - Summary with pass/fail status for key metrics

### Getting JWT Tokens

To get JWT tokens for testing:

1. **Admin Token**: Login via admin web portal or use Cognito directly
2. **Employee Token**: Login via mobile app or use a test employee account

You can also use Postman collections to authenticate and copy tokens.

### Example Output

```json
{
  "timestamp": "2025-01-20T10:30:00.000Z",
  "metrics": {
    "feed_p95": 245.5,
    "feed_p95_target": 300,
    "feed_p95_pass": true,
    "error_rate": 0.002,
    "error_rate_target": 0.01,
    "error_rate_pass": true
  }
}
```

### Troubleshooting

**Issue**: Tests fail with 401 Unauthorized
- **Solution**: Ensure JWT tokens are valid and not expired. Tokens typically expire after 1 hour.

**Issue**: Feed p95 exceeds 300ms
- **Solution**: 
  - Check database query performance
  - Verify indexes are created
  - Check if ETag caching is working
  - Monitor backend logs for slow queries

**Issue**: High error rate
- **Solution**:
  - Check backend logs for errors
  - Verify database connectivity
  - Ensure all required migrations are applied
  - Check if services are running

### CI/CD Integration

To integrate into CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run k6 Performance Tests
  run: |
    k6 run --out json=results.json phase5.js
  env:
    EVENTS_API_BASE_URL: ${{ secrets.EVENTS_API_URL }}
    ADMIN_JWT_TOKEN: ${{ secrets.ADMIN_JWT_TOKEN }}
```

## Other Phase Tests

- `phase4.js` - Schedules & Tasks performance tests
- `booking-k6.js` - Booking system performance tests

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [Phase 5 Requirements](../docs/PHASE5_REQUIREMENTS.md)

