# Admin View All Data Fix

## Problem

After granting admin access to `sathija.d@eyepax.com`:
- ✅ Admin interface shows correctly
- ❌ Leave management page shows only **that admin user's own leave requests** (not all users)
- ❌ All bookings page shows **no bookings at all**
- ✅ Original admin (`admin@test.com`) shows all details correctly

## Root Cause

The handlers were **always filtering by user_id**, even for admins when they should see ALL data:

1. **Booking Handler** (`listBookings.ts`):
   - Line 41: `const targetUserId = query.user_id ?? numericUserId;`
   - This **always** set userId filter, even when admin wants to see all bookings
   - Result: Only showed admin's own bookings

2. **Leave Handler** (`listRequests.ts`):
   - Line 35: `const targetUserId = query.user_id ? Number(query.user_id) : numericUserId;`
   - Same issue - always defaulted to admin's own userId
   - Result: Only showed admin's own leave requests

3. **Leave Service** (`leaveService.ts`):
   - Lines 63-69: Even when handler passed undefined, service forced it to admin's userId
   - Result: Service override prevented showing all data

## Solution

**Changed the logic so admins see ALL data when no `user_id` is provided:**

### Booking Backend Fix

**File: `booking-backend/src/handlers/bookings/listBookings.ts`**

```typescript
// OLD (WRONG):
const targetUserId = query.user_id ?? numericUserId;  // Always filtered

// NEW (CORRECT):
const targetUserId = isAdmin 
  ? query.user_id  // Admins: undefined = show all, or specific user_id
  : (query.user_id ?? numericUserId);  // Non-admins: always their own id

const filters = {
  ...(targetUserId !== undefined ? { userId: targetUserId } : {}),  // Only filter if provided
  // ... other filters
};
```

### Leave Backend Fixes

**File: `leave-attendance-backend/src/handlers/leave/listRequests.ts`**

```typescript
// OLD (WRONG):
const targetUserId = query.user_id ? Number(query.user_id) : numericUserId;  // Always filtered

// NEW (CORRECT):
const targetUserId = isAdmin
  ? (query.user_id ? Number(query.user_id) : undefined)  // Admins: undefined = show all
  : numericUserId;  // Non-admins: always their own id

const filters = {
  ...(targetUserId !== undefined ? { userId: targetUserId } : {}),  // Only filter if provided
  // ... other filters
};
```

**File: `leave-attendance-backend/src/services/leaveService.ts`**

```typescript
// OLD (WRONG):
if (filterUserId != null && Number.isFinite(filterUserId) && filterUserId > 0) {
  scopedFilters.userId = filterUserId;
} else {
  scopedFilters.userId = numericUserId;  // Always set to admin's own id
}

// NEW (CORRECT):
if (filterUserId != null && Number.isFinite(filterUserId) && filterUserId > 0) {
  scopedFilters.userId = filterUserId;
}
// If undefined, leave it undefined (show all requests)
```

## How It Works Now

### Admin Viewing All Data

When admin accesses `/admin/leave` or `/admin/booking/bookings`:
1. Frontend sends request **WITHOUT** `user_id` parameter
2. Backend handler detects admin role
3. Handler sets `userId` filter to **undefined**
4. Repository query **doesn't filter by userId** (shows all records)
5. ✅ Admin sees all data

### Admin Viewing Specific User

When admin wants to see a specific user's data:
1. Frontend sends request **WITH** `user_id` parameter
2. Backend handler detects admin role
3. Handler sets `userId` filter to the **provided user_id**
4. Repository query filters by that userId
5. ✅ Admin sees that user's data

### Non-Admin Viewing Their Data

For regular employees:
1. Handler always sets `userId` filter to their own id
2. Repository filters by their userId
3. ✅ Employee sees only their own data

## Files Changed

### Booking Backend
- ✅ `src/handlers/bookings/listBookings.ts` - Fixed to show all bookings for admins

### Leave-Attendance Backend
- ✅ `src/handlers/leave/listRequests.ts` - Fixed to show all requests for admins
- ✅ `src/services/leaveService.ts` - Fixed to not override undefined userId

## Testing

After deploying:

1. **Login as admin** (`admin@test.com`)
2. **Grant admin access** to `sathija.d@eyepax.com`
3. **Login as `sathija.d@eyepax.com`** (or have them test)
4. **Verify they can see:**
   - ✅ `/admin/leave` - Shows ALL leave requests from ALL users
   - ✅ `/admin/booking/bookings` - Shows ALL bookings from ALL users
   - ✅ `/admin/booking/reports` - Shows booking reports with all data

## Deployment

```powershell
# Booking Backend
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\booking-backend"
npm run build
npm run deploy:dev

# Leave Backend
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\leave-attendance-backend"
npm run build
npm run deploy:dev
```

## Summary

The issue was that handlers were **always filtering by userId**, even when admins should see all data. The fix makes handlers:
- Set `userId` filter to **undefined** for admins when no `user_id` is provided
- Only filter by userId when:
  - User is not admin (always filter)
  - OR admin explicitly wants to see specific user (user_id provided)

Now admins see ALL data by default, just like `admin@test.com` does! 🎉

