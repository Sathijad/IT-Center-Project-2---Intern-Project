# Postman Testing Guide - Booking API

## Base Configuration

**Base URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com`

**Authentication:** All endpoints (except `/healthz`) require a Cognito JWT token in the Authorization header.

**Authorization Header Format:**
```
Authorization: Bearer <your-cognito-jwt-token>
```

**Content-Type:** `application/json` (for POST/PATCH requests)

---

## 1. Health Check (No Auth Required)

### GET /healthz
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/healthz`
- **Headers:** None required
- **Body:** None
- **Expected Response:** 200 OK
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "service": "booking-api"
}
```

---

## 2. Rooms Endpoints

### 2.1 List Rooms
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Query Parameters (all optional):**
  - `date` - Filter by date (ISO 8601 date format, e.g., `2025-01-20`)
  - `capacity` - Minimum capacity (integer, e.g., `10`)
  - `amenities` - Comma-separated list (e.g., `Projector,Whiteboard`)
  - `active` - Filter by active status (`true` or `false`)
  - `location` - Filter by location (partial match, e.g., `Floor 2`)
- **Example URL with filters:**
  ```
  /api/v1/rooms?capacity=10&active=true&location=Floor
  ```
- **Expected Response:** 200 OK
```json
{
  "rooms": [
    {
      "id": 1,
      "name": "Conference Room A",
      "capacity": 20,
      "amenities": ["Projector", "Whiteboard"],
      "location": "Floor 2",
      "active": true,
      "ownerTeamId": null,
      "externalCalendarId": null,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

### 2.2 Get Room by ID
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms/{id}`
- **Path Parameters:**
  - `id` - Room ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Example URL:**
  ```
  /api/v1/rooms/1
  ```
- **Expected Response:** 200 OK
```json
{
  "room": {
    "id": 1,
    "name": "Conference Room A",
    "capacity": 20,
    "amenities": ["Projector", "Whiteboard"],
    "location": "Floor 2",
    "active": true,
    "ownerTeamId": null,
    "externalCalendarId": null,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z"
  }
}
```

### 2.3 Get Room Availability
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms/{id}/availability`
- **Path Parameters:**
  - `id` - Room ID (integer, e.g., `1`)
- **Query Parameters (required):**
  - `start` - Start time (ISO 8601 datetime, e.g., `2025-01-20T09:00:00Z`)
  - `end` - End time (ISO 8601 datetime, e.g., `2025-01-20T17:00:00Z`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Example URL:**
  ```
  /api/v1/rooms/1/availability?start=2025-01-20T09:00:00Z&end=2025-01-20T17:00:00Z
  ```
- **Expected Response:** 200 OK
```json
{
  "roomId": 1,
  "start": "2025-01-20T09:00:00.000Z",
  "end": "2025-01-20T17:00:00.000Z",
  "bookings": [
    {
      "id": 1,
      "start": "2025-01-20T10:00:00.000Z",
      "end": "2025-01-20T11:00:00.000Z",
      "title": "Team Meeting"
    }
  ],
  "blackouts": [
    {
      "id": 1,
      "start": "2025-01-20T12:00:00.000Z",
      "end": "2025-01-20T13:00:00.000Z",
      "reason": "Maintenance"
    }
  ]
}
```

### 2.4 Create Room (ADMIN only)
- **Method:** POST
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "name": "Conference Room B",
  "capacity": 15,
  "amenities": ["Projector", "Video Conferencing"],
  "location": "Floor 3",
  "active": true,
  "owner_team_id": null
}
```
- **Required Fields:** `name`, `capacity`
- **Optional Fields:** `amenities` (array), `location` (string), `active` (boolean), `owner_team_id` (integer)
- **Expected Response:** 201 Created
```json
{
  "room": {
    "id": 2,
    "name": "Conference Room B",
    "capacity": 15,
    "amenities": ["Projector", "Video Conferencing"],
    "location": "Floor 3",
    "active": true,
    "ownerTeamId": null,
    "externalCalendarId": null,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z"
  }
}
```

### 2.5 Update Room (ADMIN only)
- **Method:** PATCH
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms/{id}`
- **Path Parameters:**
  - `id` - Room ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body (JSON) - All fields optional:**
```json
{
  "name": "Conference Room A - Updated",
  "capacity": 25,
  "amenities": ["Projector", "Whiteboard", "Video Conferencing"],
  "location": "Floor 2 - Updated",
  "active": true,
  "owner_team_id": 1
}
```
- **Expected Response:** 200 OK
```json
{
  "room": {
    "id": 1,
    "name": "Conference Room A - Updated",
    "capacity": 25,
    "amenities": ["Projector", "Whiteboard", "Video Conferencing"],
    "location": "Floor 2 - Updated",
    "active": true,
    "ownerTeamId": 1,
    "externalCalendarId": null,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  }
}
```

### 2.6 Delete Room (ADMIN only)
- **Method:** DELETE
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms/{id}`
- **Path Parameters:**
  - `id` - Room ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Expected Response:** 200 OK
```json
{
  "room": {
    "id": 1,
    "name": "Conference Room A",
    "capacity": 20,
    "amenities": ["Projector", "Whiteboard"],
    "location": "Floor 2",
    "active": false,
    "ownerTeamId": null,
    "externalCalendarId": null,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  },
  "message": "Room deactivated"
}
```

---

## 3. Bookings Endpoints

### 3.1 List Bookings
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/bookings`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Query Parameters (all optional):**
  - `user_id` - Filter by user ID (integer, ADMIN only)
  - `room_id` - Filter by room ID (integer)
  - `start_date` - Filter by start date (ISO 8601 datetime)
  - `end_date` - Filter by end date (ISO 8601 datetime)
  - `status` - Filter by status (`PENDING`, `CONFIRMED`, `CANCELLED`)
- **Note:** Non-admin users can only see their own bookings
- **Example URL with filters:**
  ```
  /api/v1/bookings?room_id=1&status=CONFIRMED&start_date=2025-01-20T00:00:00Z
  ```
- **Expected Response:** 200 OK
```json
{
  "bookings": [
    {
      "id": 1,
      "roomId": 1,
      "userId": 123,
      "startTs": "2025-01-20T10:00:00.000Z",
      "endTs": "2025-01-20T11:00:00.000Z",
      "status": "CONFIRMED",
      "title": "Team Meeting",
      "attendees": ["user1@example.com", "user2@example.com"],
      "idempotencyKey": null,
      "externalEventId": null,
      "createdAt": "2025-01-20T09:00:00.000Z",
      "updatedAt": "2025-01-20T09:00:00.000Z"
    }
  ]
}
```

### 3.2 Get Booking by ID
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/bookings/{id}`
- **Path Parameters:**
  - `id` - Booking ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Example URL:**
  ```
  /api/v1/bookings/1
  ```
- **Expected Response:** 200 OK
```json
{
  "booking": {
    "id": 1,
    "roomId": 1,
    "userId": 123,
    "startTs": "2025-01-20T10:00:00.000Z",
    "endTs": "2025-01-20T11:00:00.000Z",
    "status": "CONFIRMED",
    "title": "Team Meeting",
    "attendees": ["user1@example.com", "user2@example.com"],
    "idempotencyKey": null,
    "externalEventId": null,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-20T09:00:00.000Z"
  }
}
```

### 3.3 Create Booking
- **Method:** POST
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/bookings`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
  - `Idempotency-Key: <unique-key>` (optional but recommended; the API will auto-generate a deterministic key if omitted)
- **Body (JSON):**
```json
{
  "room_id": 1,
  "start_ts": "2025-01-20T10:00:00Z",
  "end_ts": "2025-01-20T11:00:00Z",
  "title": "Team Meeting",
  "attendees": ["user1@example.com", "user2@example.com"]
}
```
- **Required Fields:** `room_id`, `start_ts`, `end_ts`
- **Optional Fields:** `title` (string), `attendees` (array of strings)
- **Expected Response:** 201 Created (or 200 OK if idempotent request)
```json
{
  "booking": {
    "id": 1,
    "roomId": 1,
    "userId": 123,
    "startTs": "2025-01-20T10:00:00.000Z",
    "endTs": "2025-01-20T11:00:00.000Z",
    "status": "CONFIRMED",
    "title": "Team Meeting",
    "attendees": ["user1@example.com", "user2@example.com"],
    "idempotencyKey": "unique-key-123",
    "externalEventId": null,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-20T09:00:00.000Z"
  }
}
```

### 3.4 Cancel Booking
- **Method:** DELETE
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/bookings/{id}`
- **Path Parameters:**
  - `id` - Booking ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Note:** Users can only cancel their own bookings (unless ADMIN)
- **Expected Response:** 200 OK
```json
{
  "booking": {
    "id": 1,
    "roomId": 1,
    "userId": 123,
    "startTs": "2025-01-20T10:00:00.000Z",
    "endTs": "2025-01-20T11:00:00.000Z",
    "status": "CANCELLED",
    "title": "Team Meeting",
    "attendees": ["user1@example.com", "user2@example.com"],
    "idempotencyKey": null,
    "externalEventId": null,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-20T09:30:00.000Z"
  }
}
```

---

## 4. Blackouts Endpoints (ADMIN only)

### 4.1 List Blackouts
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/blackouts`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Query Parameters (optional):**
  - `room_id` - Filter by room ID (integer)
- **Example URL:**
  ```
  /api/v1/blackouts?room_id=1
  ```
- **Expected Response:** 200 OK
```json
{
  "blackouts": [
    {
      "id": 1,
      "roomId": 1,
      "startTs": "2025-01-20T12:00:00.000Z",
      "endTs": "2025-01-20T13:00:00.000Z",
      "reason": "Maintenance",
      "createdBy": 123,
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

### 4.2 Create Blackout
- **Method:** POST
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/blackouts`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "room_id": 1,
  "start_ts": "2025-01-20T12:00:00Z",
  "end_ts": "2025-01-20T13:00:00Z",
  "reason": "Maintenance"
}
```
- **Required Fields:** `room_id`, `start_ts`, `end_ts`
- **Optional Fields:** `reason` (string)
- **Expected Response:** 201 Created
```json
{
  "blackout": {
    "id": 1,
    "roomId": 1,
    "startTs": "2025-01-20T12:00:00.000Z",
    "endTs": "2025-01-20T13:00:00.000Z",
    "reason": "Maintenance",
    "createdBy": 123,
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
}
```

### 4.3 Update Blackout
- **Method:** PATCH
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/blackouts/{id}`
- **Path Parameters:**
  - `id` - Blackout ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body (JSON) - All fields optional:**
```json
{
  "start_ts": "2025-01-20T12:30:00Z",
  "end_ts": "2025-01-20T13:30:00Z",
  "reason": "Extended Maintenance"
}
```
- **Expected Response:** 200 OK
```json
{
  "blackout": {
    "id": 1,
    "roomId": 1,
    "startTs": "2025-01-20T12:30:00.000Z",
    "endTs": "2025-01-20T13:30:00.000Z",
    "reason": "Extended Maintenance",
    "createdBy": 123,
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
}
```

### 4.4 Delete Blackout
- **Method:** DELETE
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/blackouts/{id}`
- **Path Parameters:**
  - `id` - Blackout ID (integer, e.g., `1`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Expected Response:** 200 OK
```json
{
  "message": "Blackout deleted"
}
```

---

## 5. Export Endpoints

### 5.1 Export Bookings as ICS
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/exports/bookings.ics`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Query Parameters (required):**
  - `start` - Start time (ISO 8601 datetime, e.g., `2025-01-20T00:00:00Z`)
  - `end` - End time (ISO 8601 datetime, e.g., `2025-01-20T23:59:59Z`)
- **Query Parameters (optional):**
  - `room_id` - Filter by room ID (integer)
- **Example URL:**
  ```
  /api/v1/exports/bookings.ics?start=2025-01-20T00:00:00Z&end=2025-01-20T23:59:59Z&room_id=1
  ```
- **Expected Response:** 200 OK
- **Content-Type:** `text/calendar`
- **Body:** ICS file content

---

## 6. Integration Endpoints

### 6.1 Enqueue MS Graph Sync
- **Method:** POST
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/integrations/msgraph/sync`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "booking_id": 1,
  "action": "create"
}
```
- **Required Fields:** `action` (enum: `create`, `update`, `delete`, `full_sync`)
- **Optional Fields:** `booking_id` (integer, required for create/update/delete actions)
- **Expected Response:** 202 Accepted
```json
{
  "message": "Sync job enqueued",
  "bookingId": 1,
  "action": "create"
}
```

### 6.2 Get Job Status
- **Method:** GET
- **URL:** `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com/api/v1/jobs/{id}`
- **Path Parameters:**
  - `id` - Job ID (string, e.g., `job-123`)
- **Headers:**
  - `Authorization: Bearer <token>`
- **Example URL:**
  ```
  /api/v1/jobs/job-123
  ```
- **Expected Response:** 200 OK
```json
{
  "jobId": "job-123",
  "status": "completed",
  "message": "Sync completed successfully"
}
```
- **Status Values:** `pending`, `processing`, `completed`, `failed`

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid JWT token",
  "requestId": "request-id-123"
}
```

### 403 Forbidden
```json
{
  "code": "FORBIDDEN",
  "message": "Insufficient permissions",
  "requestId": "request-id-123"
}
```

### 404 Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "Resource not found",
  "requestId": "request-id-123"
}
```

### 400 Bad Request
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "field": "start_ts",
    "error": "Invalid datetime format"
  },
  "requestId": "request-id-123"
}
```

### 409 Conflict
```json
{
  "code": "BOOKING_CONFLICT",
  "message": "Room is already booked for this time slot",
  "requestId": "request-id-123"
}
```

---

## Testing Tips

1. **Get a JWT Token:**
   - Use your Cognito user pool to authenticate and get a JWT token
   - The token should be included in the `Authorization` header as `Bearer <token>`

2. **Test Order:**
   - Start with `/healthz` to verify the API is accessible
   - List rooms to see available rooms
   - Create a booking using a room ID
   - Check availability for a room
   - Cancel the booking
   - (As ADMIN) Create/update/delete rooms and blackouts

3. **Date/Time Format:**
   - Always use ISO 8601 format: `2025-01-20T10:00:00Z`
   - Ensure `end_ts` is after `start_ts`

4. **Idempotency:**
   - Supplying an `Idempotency-Key` header is recommended to make retries safe. If you don’t provide one, the API automatically generates a deterministic key based on the booking details, so duplicate submissions with the same payload will still reuse the original booking.
   - The `Idempotency-Key` column in the `bookings` table will now always contain either your supplied value or the auto-generated key.

5. **Role-Based Access:**
   - Regular users can: list rooms, view availability, create/cancel their own bookings
   - ADMIN users can: all of the above + manage rooms and blackouts

---

## Postman Collection Setup

1. Create a new Postman Collection named "Booking API"
2. Set collection variables:
   - `baseUrl`: `https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com`
   - `token`: `<your-jwt-token>` (update this with your actual token)
3. Set collection authorization:
   - Type: Bearer Token
   - Token: `{{token}}`
4. Create folders for each endpoint group:
   - Health Check
   - Rooms
   - Bookings
   - Blackouts
   - Exports
   - Integrations
   - Jobs

