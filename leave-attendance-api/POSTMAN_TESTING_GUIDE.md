# Postman Testing Guide for Leave Endpoints

This guide will help you test all the leave endpoints using Postman.

## 📋 Prerequisites

1. **Server Running**: Make sure the leave-attendance-api server is running on `http://localhost:8082`
   ```powershell
   cd leave-attendance-api
   npm run dev
   ```

2. **Authentication Token**: You need a valid JWT token (Bearer token) from AWS Cognito. You can get this by:
   - Logging in through the admin-web app (token will be in browser's localStorage as `access_token`)
   - Or using AWS Cognito directly
   - Or using the auth-backend to authenticate

## 🔑 Getting a JWT Token

### Option 1: From Admin Web App (Easiest)
1. Start the admin-web app: `cd admin-web && npm run dev`
2. Open browser and navigate to `http://localhost:5173`
3. Login using Cognito
4. Open browser DevTools (F12) → Application → Local Storage
5. Copy the `access_token` value

### Option 2: Using Auth Backend
1. Start auth-backend on `http://localhost:8080`
2. Login through the web interface or use the `/api/v1/auth/login` endpoint
3. Extract the token from the response

## 🚀 Setting Up Postman

### Step 1: Create a New Collection
1. Open Postman
2. Click "New" → "Collection"
3. Name it "Leave API Tests"

### Step 2: Set Up Collection Variables
1. Select your collection
2. Go to "Variables" tab
3. Add these variables:
   - `base_url`: `http://localhost:8082`
   - `token`: `your_jwt_token_here` (paste your access token)

### Step 3: Set Up Collection-Level Authorization
1. In your collection, go to "Authorization" tab
2. Type: **Bearer Token**
3. Token: `{{token}}`
   - This will automatically add the Authorization header to all requests

## 📝 Endpoints to Test

### 1. Get Leave Balance
**Endpoint**: `GET /api/v1/leave/balance`

**Request Details:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/leave/balance`
- Headers: (Authorization will be added automatically from collection settings)

**Query Parameters (Optional):**
- `user_id` (number): For admins to view another user's balance

**Expected Response:**
```json
{
  "data": {
    "annual": 20,
    "sick": 10,
    "casual": 5,
    "used": {
      "annual": 5,
      "sick": 2,
      "casual": 1
    },
    "remaining": {
      "annual": 15,
      "sick": 8,
      "casual": 4
    }
  }
}
```

**Test Cases:**
- ✅ Test as EMPLOYEE (should get own balance)
- ✅ Test as ADMIN (should get own balance)
- ✅ Test as ADMIN with `user_id` query param (should get other user's balance)
- ❌ Test as EMPLOYEE with `user_id` query param (should return 403 Forbidden)

---

### 2. List Leave Requests
**Endpoint**: `GET /api/v1/leave/requests`

**Request Details:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/leave/requests`

**Query Parameters (Optional):**
- `user_id` (number): Filter by user (ADMIN only)
- `status` (string): Filter by status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
- `from` (date): Filter from date (ISO format: `2024-01-01`)
- `to` (date): Filter to date (ISO format: `2024-12-31`)
- `page` (number): Page number (default: 1)
- `size` (number): Page size (default: 20)

**Example URLs:**
- `{{base_url}}/api/v1/leave/requests`
- `{{base_url}}/api/v1/leave/requests?status=PENDING&page=1&size=10`
- `{{base_url}}/api/v1/leave/requests?from=2024-01-01&to=2024-12-31`

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "policyId": 1,
      "startDate": "2024-01-15",
      "endDate": "2024-01-17",
      "days": 3,
      "status": "PENDING",
      "reason": "Family vacation",
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Test Cases:**
- ✅ Test as EMPLOYEE (should get own requests only)
- ✅ Test as ADMIN (should get all requests)
- ✅ Test with status filter
- ✅ Test with date range filter
- ✅ Test pagination

---

### 3. Create Leave Request
**Endpoint**: `POST /api/v1/leave/requests`

**Request Details:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/leave/requests`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "policyId": 1,
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation",
  "halfDay": null
}
```

**For Half-Day Leave:**
```json
{
  "policyId": 1,
  "startDate": "2024-02-01",
  "endDate": "2024-02-01",
  "reason": "Doctor appointment",
  "halfDay": "AM"
}
```

**Required Fields:**
- `policyId` (number): Leave policy ID (e.g., 1 for Annual, 2 for Sick, etc.)
- `startDate` (string): Start date in ISO format (`YYYY-MM-DD`)
- `endDate` (string): End date in ISO format (`YYYY-MM-DD`)
- `reason` (string, optional): Reason for leave
- `halfDay` (string, optional): `"AM"` or `"PM"` for half-day leave

**Expected Response:**
```json
{
  "data": {
    "id": 2,
    "userId": 1,
    "policyId": 1,
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "days": 5,
    "status": "PENDING",
    "reason": "Family vacation",
    "createdAt": "2024-01-25T10:00:00Z"
  }
}
```

**Test Cases:**
- ✅ Create full-day leave request
- ✅ Create half-day leave request (AM)
- ✅ Create half-day leave request (PM)
- ✅ Create single-day leave request
- ❌ Test with invalid policyId
- ❌ Test with endDate before startDate
- ❌ Test with invalid halfDay value (should be "AM" or "PM")
- ❌ Test without required fields

---

### 4. Update Leave Request Status (Approve/Reject)
**Endpoint**: `PATCH /api/v1/leave/requests/:id`

**Request Details:**
- Method: `PATCH`
- URL: `{{base_url}}/api/v1/leave/requests/1` (replace `1` with actual request ID)
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):

**To Approve:**
```json
{
  "status": "APPROVED",
  "comments": "Approved. Enjoy your vacation!"
}
```

**To Reject:**
```json
{
  "status": "REJECTED",
  "comments": "Cannot approve due to project deadline."
}
```

**Required Fields:**
- `status` (string): Must be `"APPROVED"` or `"REJECTED"`
- `comments` (string, optional): Admin comments

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "policyId": 1,
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "days": 5,
    "status": "APPROVED",
    "reason": "Family vacation",
    "comments": "Approved. Enjoy your vacation!",
    "updatedAt": "2024-01-26T14:00:00Z"
  }
}
```

**Test Cases:**
- ✅ Approve a pending request (as ADMIN)
- ✅ Reject a pending request (as ADMIN)
- ❌ Test as EMPLOYEE (should return 403 Forbidden)
- ❌ Test with invalid status value
- ❌ Test with non-existent request ID

---

### 5. Cancel Leave Request
**Endpoint**: `PATCH /api/v1/leave/requests/:id/cancel`

**Request Details:**
- Method: `PATCH`
- URL: `{{base_url}}/api/v1/leave/requests/1/cancel` (replace `1` with actual request ID)
- Headers:
  - `Content-Type: application/json`
- Body: Can be empty `{}` or no body

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "userId": 1,
    "policyId": 1,
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "days": 5,
    "status": "CANCELLED",
    "reason": "Family vacation",
    "updatedAt": "2024-01-27T10:00:00Z"
  }
}
```

**Test Cases:**
- ✅ Cancel own pending request (as EMPLOYEE)
- ✅ Cancel own approved request (as EMPLOYEE)
- ✅ Cancel any user's request (as ADMIN)
- ❌ Cancel already cancelled request (should return error)
- ❌ Cancel request that doesn't belong to you (as EMPLOYEE, should return 403)

---

## 🔧 Common Postman Setup Tips

### 1. Adding Pre-request Scripts (Optional)
You can add a script to automatically refresh the token:

```javascript
// Pre-request script (optional - for token refresh)
// This would need to be customized based on your token refresh logic
```

### 2. Adding Tests (Optional)
Add automated tests to verify responses:

```javascript
// Example test for Get Balance endpoint
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data property", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});
```

### 3. Environment Variables
Create separate environments for:
- `Development`: `http://localhost:8082`
- `Staging`: Your staging URL
- `Production`: Your production URL

## 🐛 Troubleshooting

### Error: 401 Unauthorized
- **Cause**: Missing or invalid token
- **Solution**: 
  - Check that token variable is set correctly
  - Verify token hasn't expired (JWT tokens typically expire after 1 hour)
  - Re-login to get a fresh token

### Error: 403 Forbidden
- **Cause**: Insufficient permissions
- **Solution**: 
  - Verify your user role (ADMIN vs EMPLOYEE)
  - Check that you're trying to access your own data (for EMPLOYEE role)

### Error: 404 Not Found
- **Cause**: Wrong endpoint or server not running
- **Solution**:
  - Verify server is running on port 8082
  - Check the endpoint URL is correct
  - Test health endpoint: `GET http://localhost:8082/healthz`

### Error: 422 Validation Error
- **Cause**: Invalid request body
- **Solution**:
  - Check required fields are present
  - Verify date formats (YYYY-MM-DD)
  - Ensure policyId is a valid number
  - Check halfDay value is "AM" or "PM" if provided

## ✅ Quick Test Checklist

Before testing, verify:
- [ ] Server is running (`http://localhost:8082/healthz` returns `{"status":"ok"}`)
- [ ] Valid JWT token is set in collection variables
- [ ] Collection-level authorization is configured
- [ ] Database is accessible and contains test data

## 📚 Additional Resources

- Check server logs for detailed error messages
- Review `leave.controller.ts` for endpoint logic
- Check `leave.service.ts` for business logic
- Review `errors.ts` for error response formats

