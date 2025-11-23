# Phase 3 Booking API - Performance Testing with k6

This directory contains k6 performance tests for the Phase 3 Booking API.

## Prerequisites

1. **Install k6**: 
   ```bash
   # Windows (using Chocolatey)
   choco install k6
   
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Get Authentication Tokens**:
   - Employee token: Get from Cognito after logging in as an employee user
   - Admin token: Get from Cognito after logging in as an admin user

## Test Files

- `booking-k6.js` - Comprehensive performance test suite covering all Phase 3 endpoints

## Running Tests

### Full Performance Test

```bash
k6 run booking-k6.js \
  --env API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com \
  --env EMPLOYEE_TOKEN=your-employee-jwt-token \
  --env ADMIN_TOKEN=your-admin-jwt-token
```

### Smoke Test (Quick Validation)

For a quick smoke test with minimal load:

```bash
k6 run booking-k6.js \
  --env API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com \
  --env EMPLOYEE_TOKEN=your-employee-jwt-token \
  --env ADMIN_TOKEN=your-admin-jwt-token \
  --stage 30s:5 \
  --stage 1m:10 \
  --stage 30s:0
```

### Custom Load Pattern

You can override the default load pattern by modifying the `options` in `booking-k6.js` or using k6's command-line options:

```bash
k6 run booking-k6.js \
  --env API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com \
  --env EMPLOYEE_TOKEN=your-employee-jwt-token \
  --env ADMIN_TOKEN=your-admin-jwt-token \
  --vus 50 \
  --duration 5m
```

## Test Scenarios

The test suite includes three scenarios:

1. **Employee Workflow** (30-60 VUs)
   - List rooms
   - Get room details
   - Check availability
   - Create bookings
   - List bookings
   - Get booking details
   - Export ICS files

2. **Admin Workflow** (5-10 VUs)
   - All employee operations
   - List all bookings
   - Manage blackout windows
   - Enqueue MS Graph sync jobs

3. **Health Check** (5 constant VUs)
   - Continuous health check monitoring

## Performance Thresholds

The tests enforce the following thresholds:

- **HTTP Request Duration**: 
  - 95th percentile < 500ms
  - 99th percentile < 1000ms
- **Error Rate**: < 2% failed requests
- **Custom Errors**: < 1%
- **Endpoint-Specific**:
  - Booking creation: p95 < 800ms
  - Room listing: p95 < 300ms
  - Availability check: p95 < 400ms
  - Booking list: p95 < 300ms

## Output

After running the tests, you'll get:

1. **Console Output**: Real-time metrics and summary
2. **booking-perf-results.json**: Detailed JSON results
3. **booking-perf-report.html**: HTML report with charts and metrics

## Understanding Results

### Key Metrics

- **http_req_duration**: Time taken for HTTP requests
- **http_req_failed**: Rate of failed requests
- **vus**: Virtual users (concurrent users)
- **iterations**: Number of test iterations completed
- **data_sent/received**: Network traffic

### Custom Metrics

- **booking_create_duration**: Time to create a booking
- **room_list_duration**: Time to list rooms
- **availability_check_duration**: Time to check availability
- **booking_list_duration**: Time to list bookings
- **blackout_create_duration**: Time to create blackout
- **ics_export_duration**: Time to export ICS file

## Troubleshooting

### Authentication Errors (401)

- Verify tokens are valid and not expired
- Check that tokens are for the correct environment
- Ensure tokens have the required roles (EMPLOYEE/ADMIN)

### High Error Rates

- Check API Gateway throttling limits
- Verify database connection pool settings
- Check Lambda concurrency limits
- Review CloudWatch logs for errors

### Slow Response Times

- Check database query performance
- Verify indexes are in place
- Review Lambda cold start times
- Check network latency to AWS

## Example Output

```
     ✓ rooms list status is 200
     ✓ rooms list has data
     ✓ get room status is 200
     ✓ availability status is 200
     ✓ booking create status is 200 or 201
     ✓ bookings list status is 200

     checks.........................: 95.00% ✓ 2850    ✗ 150
     data_received..................: 2.5 MB 8.3 kB/s
     data_sent......................: 450 kB 1.5 kB/s
     http_req_duration..............: avg=245ms min=120ms med=220ms max=850ms p(95)=480ms p(99)=920ms
     http_req_failed................: 1.50%  ✓ 45     ✗ 2955
     iteration_duration.............: avg=2.1s min=1.2s med=2.0s max=4.5s
     vus............................: 50     min=0     max=100
     vus_max........................: 100    min=100   max=100
```

## CI/CD Integration

You can integrate k6 tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run k6 Performance Tests
  run: |
    k6 run tests/perf/booking-k6.js \
      --env API_BASE_URL=${{ secrets.API_BASE_URL }} \
      --env EMPLOYEE_TOKEN=${{ secrets.EMPLOYEE_TOKEN }} \
      --env ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }}
```

## Best Practices

1. **Start Small**: Begin with low VU counts and gradually increase
2. **Monitor Resources**: Watch CloudWatch metrics during tests
3. **Test Realistic Scenarios**: Use realistic data and user patterns
4. **Run Regularly**: Include performance tests in your CI/CD pipeline
5. **Compare Results**: Track performance over time to detect regressions
6. **Test Different Environments**: Run tests against DEV, STG, and PRD separately

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)

