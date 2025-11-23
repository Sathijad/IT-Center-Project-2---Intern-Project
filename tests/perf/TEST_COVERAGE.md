# Phase 3 Booking API - k6 Test Coverage

## Endpoints Tested

### ✅ Health & System
- [x] `GET /healthz` - Health check

### ✅ Rooms (Employee & Admin)
- [x] `GET /api/v1/rooms` - List/search rooms
- [x] `GET /api/v1/rooms/{id}` - Get room details
- [x] `GET /api/v1/rooms/{id}/availability` - Get availability timeline

### ✅ Bookings (Employee & Admin)
- [x] `GET /api/v1/bookings` - List bookings
- [x] `GET /api/v1/bookings/{id}` - Get booking details
- [x] `POST /api/v1/bookings` - Create booking (with idempotency)
- [x] `DELETE /api/v1/bookings/{id}` - Cancel booking

### ✅ Blackouts (Admin Only)
- [x] `GET /api/v1/blackouts` - List blackout windows
- [x] `POST /api/v1/blackouts` - Create blackout window
- [x] `PATCH /api/v1/blackouts/{id}` - Update blackout window
- [x] `DELETE /api/v1/blackouts/{id}` - Delete blackout window

### ✅ Exports
- [x] `GET /api/v1/exports/bookings.ics` - Export bookings as ICS

### ✅ Integrations
- [x] `POST /api/v1/integrations/msgraph/sync` - Enqueue MS Graph sync

### ⚠️ Not Tested (Requires Specific Conditions)
- `GET /api/v1/jobs/{id}` - Get job status (requires job ID from previous operation)
- `POST /api/v1/rooms` - Create room (admin only, not in main workflow)
- `PATCH /api/v1/rooms/{id}` - Update room (admin only, not in main workflow)
- `DELETE /api/v1/rooms/{id}` - Delete room (admin only, not in main workflow)

## Test Scenarios

### Employee Workflow
Tests the most common user operations:
1. List rooms with filters
2. Get room details
3. Check room availability
4. Create booking with idempotency
5. List bookings
6. Get booking details
7. Cancel booking (30% chance)
8. Export ICS (30% chance)
9. List user's bookings

### Admin Workflow
Tests admin-specific operations:
1. List all rooms
2. List all bookings
3. List blackout windows
4. Create blackout window (20% chance)
5. Update blackout window (if created)
6. Delete blackout window (50% chance if created)
7. Enqueue MS Graph sync (10% chance)

### Health Check
Continuous monitoring:
1. Health check endpoint

## Performance Metrics Tracked

### Custom Metrics
- `booking_create_duration` - Time to create booking
- `room_list_duration` - Time to list rooms
- `availability_check_duration` - Time to check availability
- `booking_list_duration` - Time to list bookings
- `blackout_create_duration` - Time to create blackout
- `ics_export_duration` - Time to export ICS file
- `total_requests` - Total number of requests made
- `errors` - Error rate

### Standard k6 Metrics
- `http_req_duration` - HTTP request duration
- `http_req_failed` - Failed request rate
- `http_reqs` - Total HTTP requests
- `vus` - Virtual users
- `iterations` - Test iterations

## Thresholds

### Global Thresholds
- HTTP request duration: p95 < 500ms, p99 < 1000ms
- Failed requests: < 2%
- Errors: < 1%

### Endpoint-Specific Thresholds
- Booking creation: p95 < 800ms
- Room listing: p95 < 300ms
- Availability check: p95 < 400ms
- Booking list: p95 < 300ms

## Load Patterns

### Full Performance Test
- Employee workflow: 30-60 VUs over 5 minutes
- Admin workflow: 5-10 VUs over 5 minutes
- Health check: 5 constant VUs

### Smoke Test
- 1-5 VUs over 40 seconds
- Basic endpoint validation only

## Test Data

- Uses seeded room data (room IDs: 1-6)
- Generates unique idempotency keys
- Creates future-dated bookings (2-4 hours from now)
- Uses realistic date ranges for availability checks

## Coverage Summary

**Total Endpoints**: 15 main endpoints  
**Tested**: 13 endpoints (87%)  
**Not Tested**: 2 endpoints (13% - require specific conditions)

**Test Scenarios**: 3 (Employee, Admin, Health Check)  
**Custom Metrics**: 8  
**Load Patterns**: 2 (Full, Smoke)

