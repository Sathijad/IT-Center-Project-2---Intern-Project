# Phase 3 Booking System - Selenium Test Commands

This document provides all Phase 3 Selenium test commands following the Phase 2 pattern.

## 🔐 Set Your Credentials

Before running any Phase 3 tests, set your credentials:

```powershell
$env:TEST_USER_EMAIL="admin@test.com"
$env:TEST_USER_PASSWORD="Admin@123"
```

**Note:** If credentials are not set, tests will use default values (`admin@test.com` / `Admin@123`).

---

## 📋 Phase 3 Selenium Test Commands

### 1. **Book Room Page Test** (Employee)
```powershell
npm run selenium:test:phase3-book-room:headful
```
**What it tests:**
- Navigate to Book Room page
- Search for rooms
- Display room list

**Requires:** Authentication first (login manually or run auth test)

---

### 2. **Room Availability Test** (Employee)
```powershell
npm run selenium:test:phase3-room-availability:headful
```
**What it tests:**
- Check room availability
- Enter start/end date/time
- View availability status

**Requires:** Authentication first

---

### 3. **My Bookings Page Test** (Employee)
```powershell
npm run selenium:test:phase3-my-bookings:headful
```
**What it tests:**
- Navigate to My Bookings page
- View user's bookings
- Display booking list

**Requires:** Authentication first

---

### 4. **Booking Rooms Page Test** (Admin)
```powershell
npm run selenium:test:phase3-booking-rooms:headful
```
**What it tests:**
- Navigate to Booking Rooms page (Admin only)
- View room list
- Display room information

**Requires:** Authentication with ADMIN role

---

### 5. **Booking Blackouts Page Test** (Admin)
```powershell
npm run selenium:test:phase3-booking-blackouts:headful
```
**What it tests:**
- Navigate to Booking Blackouts page (Admin only)
- View blackout windows
- Display blackout list

**Requires:** Authentication with ADMIN role

---

### 6. **Admin Bookings Page Test** (Admin)
```powershell
npm run selenium:test:phase3-admin-bookings:headful
```
**What it tests:**
- Navigate to Admin Bookings page (Admin only)
- View all bookings
- Test filters (status, room, date range)

**Requires:** Authentication with ADMIN role

---

### 7. **Booking Reports Page Test** (Admin)
```powershell
npm run selenium:test:phase3-booking-reports:headful
```
**What it tests:**
- Navigate to Booking Reports page (Admin only)
- View utilization reports
- Set date range
- Display utilization statistics

**Requires:** Authentication with ADMIN role

---

### 8. **Navigation Flow Test**
```powershell
npm run selenium:test:phase3-navigation:headful
```
**What it tests:**
- Navigate through all Phase 3 pages
- Test navigation between:
  - Dashboard
  - Book Room
  - My Bookings
  - Admin Bookings
  - Booking Rooms
  - Booking Blackouts
  - Booking Reports

**Requires:** Authentication first

---

## 🎯 Quick Reference

### Employee Features
```powershell
# Set credentials
$env:TEST_USER_EMAIL="admin@test.com"
$env:TEST_USER_PASSWORD="Admin@123"

# Run tests
npm run selenium:test:phase3-book-room:headful
npm run selenium:test:phase3-room-availability:headful
npm run selenium:test:phase3-my-bookings:headful
```

### Admin Features
```powershell
# Set credentials (must have ADMIN role)
$env:TEST_USER_EMAIL="admin@test.com"
$env:TEST_USER_PASSWORD="Admin@123"

# Run tests
npm run selenium:test:phase3-booking-rooms:headful
npm run selenium:test:phase3-booking-blackouts:headful
npm run selenium:test:phase3-admin-bookings:headful
npm run selenium:test:phase3-booking-reports:headful
```

### Navigation
```powershell
npm run selenium:test:phase3-navigation:headful
```

---

## ⚠️ Important Notes

### Authentication Required

**All Phase 3 tests require authentication first.** The tests will:
1. Navigate to login page
2. Enter email and password (from `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`)
3. Click Sign In
4. **⏸️ PAUSE** - You must manually enter verification code
5. Continue with the test

### Manual Verification Code Entry

When the test pauses for verification code:
1. Check your email/SMS for the code
2. Enter the code in the browser window
3. Click Verify/Submit button
4. Test will continue automatically

### Test Execution Order

**Recommended order:**
1. Set credentials once:
   ```powershell
   $env:TEST_USER_EMAIL="admin@test.com"
   $env:TEST_USER_PASSWORD="Admin@123"
   ```

2. Run tests individually:
   ```powershell
   npm run selenium:test:phase3-book-room:headful
   npm run selenium:test:phase3-my-bookings:headful
   # etc...
   ```

---

## 📊 Test Summary

| Command | Feature | Role | Duration |
|---------|---------|------|----------|
| `selenium:test:phase3-book-room:headful` | Book Room | Employee | ~1-2 min |
| `selenium:test:phase3-room-availability:headful` | Room Availability | Employee | ~1-2 min |
| `selenium:test:phase3-my-bookings:headful` | My Bookings | Employee | ~1 min |
| `selenium:test:phase3-booking-rooms:headful` | Booking Rooms | Admin | ~1 min |
| `selenium:test:phase3-booking-blackouts:headful` | Booking Blackouts | Admin | ~1 min |
| `selenium:test:phase3-admin-bookings:headful` | Admin Bookings | Admin | ~1-2 min |
| `selenium:test:phase3-booking-reports:headful` | Booking Reports | Admin | ~1-2 min |
| `selenium:test:phase3-navigation:headful` | Navigation | All | ~2 min |

---

## 🔧 Configuration

### Environment Variables

```powershell
# Required for authentication
$env:TEST_USER_EMAIL="your-email@example.com"
$env:TEST_USER_PASSWORD="your-password"

# Optional - Base URL (default: http://localhost:5173)
$env:WEB_BASE_URL="http://localhost:5173"

# Optional - Browser mode (default: headful/visible)
$env:HEADFUL="true"
```

### Default Values

If `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are not set:
- Email: `admin@test.com`
- Password: `Admin@123`

---

## 🐛 Troubleshooting

### Test Fails - Not Authenticated

**Solution:** Tests require authentication. The test will:
1. Try to login automatically
2. Pause for verification code
3. You enter code manually
4. Test continues

### Credentials Not Working

**Check:**
- Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set correctly
- Check credentials in Cognito
- Ensure user exists and is active

### Browser Doesn't Open

**Check:**
- Chrome browser is installed
- ChromeDriver is installed: `npm list chromedriver`
- `HEADFUL=true` is set (default in commands)

### Verification Code Not Appearing

**Check:**
- Email inbox (including spam)
- SMS messages
- Test waits up to 5 minutes
- Browser window is visible

---

## 📚 Related Documentation

- **Complete Details:** `PHASE3_SELENIUM_DETAILS.md`
- **Testing Guide:** `PHASE3_TESTING_GUIDE.md`
- **Test Commands:** `PHASE3_TEST_COMMANDS.md`

