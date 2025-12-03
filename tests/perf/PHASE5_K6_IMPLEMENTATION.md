# Phase 5 k6 Performance Testing - Implementation Summary

## Overview

Comprehensive k6 performance test suite for Phase 5 Events & Announcements API, designed to validate the critical performance requirements:
- **Feed p95 latency < 300ms** (primary requirement)
- **Error rate < 1%**
- **Broadcast success > 98%**

## Files Created

### 1. `phase5.js`
Main k6 test script covering all Phase 5 endpoints:
- Feed list endpoint (critical for p95 requirement)
- Event detail retrieval
- Event CRUD operations (create, update)
- Moderation workflow
- Broadcast functionality
- Tag search and suggestions
- Audit log retrieval
- ETag caching validation

### 2. `run-phase5-k6.ps1`
PowerShell helper script for easy test execution:
- Validates k6 installation
- Prompts for JWT tokens if not provided
- Configures environment variables
- Runs tests with proper error handling
- Displays results summary

### 3. `README.md`
Comprehensive documentation:
- Installation instructions
- Usage examples
- Test scenarios explanation
- Troubleshooting guide
- CI/CD integration examples

## Test Coverage

### Endpoints Tested

1. **GET /api/v1/events** ⭐ (Critical - p95 < 300ms)
   - Pagination
   - Filtering (channel, tags, status)
   - ETag caching
   - Response time monitoring

2. **GET /api/v1/events/:id**
   - Individual event retrieval
   - ETag support

3. **GET /api/v1/tags**
   - Tag library search

4. **POST /api/v1/events** (Admin)
   - Event creation with full payload

5. **PATCH /api/v1/events/:id** (Admin)
   - Event updates

6. **POST /api/v1/events/tag-suggest** (Admin)
   - Tag suggestion endpoint

7. **POST /api/v1/events/:id/moderate** (Admin)
   - Moderation workflow (APPROVE/REJECT)

8. **POST /api/v1/events/:id/broadcast** (Admin)
   - Broadcast with idempotency key
   - Multiple channels (PUSH, EMAIL, TEAMS)

9. **GET /api/v1/events/:id/audit** (Admin)
   - Audit log retrieval

10. **ETag Caching Test**
    - HTTP 304 Not Modified validation

## Performance Thresholds

```javascript
{
  'http_req_duration{name:feed_list}': ['p(95)<300'],  // Phase 5 requirement
  'http_req_duration{name:event_detail}': ['p(95)<500'],
  'http_req_duration': ['p(95)<500'],
  'errors': ['rate<0.01'],                              // < 1%
  'http_req_failed': ['rate<0.01'],                     // < 1%
  'feed_slow': ['rate<0.05'],                           // < 5% exceed 300ms
}
```

## Load Pattern

- **Ramp up**: 30s to 50 VUs
- **Sustained load**: 2m at 100 VUs
- **Ramp down**: 30s to 0 VUs

## Usage

### Quick Start

```powershell
# Using the PowerShell script
cd tests/perf
.\run-phase5-k6.ps1

# Or directly with k6
$env:EVENTS_API_BASE_URL = "http://localhost:8085"
$env:ADMIN_JWT_TOKEN = "your-token"
k6 run phase5.js
```

### Custom Load

```powershell
k6 run --vus 200 --duration 10m phase5.js
```

## Output Files

After execution, generates:
- `phase5-perf-results.json` - Full k6 metrics
- `phase5-summary.json` - Summary with pass/fail status

## Key Features

1. **Feed Performance Monitoring**: Special tracking for feed endpoint to ensure p95 < 300ms
2. **Custom Metrics**: Tracks feed latency and error rates separately
3. **ETag Caching**: Validates HTTP caching behavior
4. **Idempotency**: Tests broadcast idempotency key handling
5. **Role-based Testing**: Tests both admin and employee endpoints
6. **Comprehensive Checks**: Validates response structure, not just status codes

## Requirements Met

✅ Feed p95 < 300ms requirement tracked  
✅ Error rate < 1% threshold configured  
✅ All Phase 5 endpoints covered  
✅ ETag caching validated  
✅ Idempotency key handling tested  
✅ Admin and employee role separation  
✅ Comprehensive response validation  

## Next Steps

1. Run initial baseline test to establish current performance
2. Identify bottlenecks if p95 exceeds 300ms
3. Optimize database queries/indexes if needed
4. Integrate into CI/CD pipeline
5. Set up regular performance monitoring

## Notes

- Tests require valid JWT tokens (admin and employee)
- Events backend must be running on configured port (default: 8085)
- Database should have some test data for realistic results
- Broadcast tests may fail if event isn't in APPROVED status (expected behavior)

