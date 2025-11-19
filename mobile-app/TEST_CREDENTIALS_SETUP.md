# Test Credentials Setup Guide

This guide shows you how to configure your admin user credentials for mobile app testing.

## Option 1: Using Environment Variables (Recommended)

### Windows PowerShell

Set environment variables for the current session:

```powershell
$env:MOBILE_TEST_EMAIL="your-admin-email@example.com"
$env:MOBILE_TEST_PASSWORD="YourSecurePassword123"
```

Then run your tests:

```powershell
npm run wdio:test
```

### Windows CMD

```cmd
set MOBILE_TEST_EMAIL=your-admin-email@example.com
set MOBILE_TEST_PASSWORD=YourSecurePassword123
npm run wdio:test
```

### Permanent Environment Variables (Windows)

1. Open **System Properties** → **Environment Variables**
2. Under **User variables**, click **New**
3. Add:
   - Variable name: `MOBILE_TEST_EMAIL`
   - Variable value: `your-admin-email@example.com`
4. Repeat for `MOBILE_TEST_PASSWORD`
5. Restart your terminal/PowerShell

## Option 2: Using .env File

1. Create a `.env` file in the `mobile-app` directory:

```env
MOBILE_TEST_EMAIL=your-admin-email@example.com
MOBILE_TEST_PASSWORD=YourSecurePassword123
```

2. Install dotenv package (if not already installed):

```powershell
npm install --save-dev dotenv
```

3. The tests will automatically load credentials from `.env` file.

**Note:** Make sure `.env` is in your `.gitignore` to avoid committing credentials!

## Option 3: Direct Code Modification (Not Recommended)

If you don't want to use environment variables, you can directly modify the test files:

**File:** `tests/mobile/login.spec.ts` (and other test files)

```typescript
const TEST_EMAIL = 'your-admin-email@example.com';
const TEST_PASSWORD = 'YourSecurePassword123';
```

⚠️ **Warning:** This method is not secure and credentials will be committed to git if you're not careful!

## Current Default Values

If no environment variables are set, the tests will use these defaults:

- **Email:** `admin@test.com`
- **Password:** `Admin@123`

## Verify Your Credentials Are Loaded

You can check if environment variables are set:

```powershell
# PowerShell
echo $env:MOBILE_TEST_EMAIL
echo $env:MOBILE_TEST_PASSWORD

# CMD
echo %MOBILE_TEST_EMAIL%
echo %MOBILE_TEST_PASSWORD%
```

## Test Files That Use Credentials

The following test files use these credentials:

- `tests/mobile/login.spec.ts`
- `tests/mobile/login-with-verification.spec.ts`
- `tests/mobile/profile.spec.ts`
- `tests/mobile/roles.read.spec.ts`
- `tests/mobile/leave-management.spec.ts`
- `tests/mobile/attendance-management.spec.ts`

All of them now support environment variables: `MOBILE_TEST_EMAIL` and `MOBILE_TEST_PASSWORD`

