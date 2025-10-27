# Fix Cognito Redirect URI Error (400 Bad Request)

## Problem
When signing in, you get `400 Bad Request` from Cognito and redirected back to the login page.

## Root Cause
The redirect URI `http://localhost:5173/auth/callback` is not configured in your Cognito User Pool.

## Solution - Add Redirect URIs to Cognito

### Step 1: Access AWS Cognito Console
1. Go to https://console.aws.amazon.com
2. Navigate to: **Cognito** → **User pools**
3. Click on: `ap-southeast-2_hTAYJId8y` (your user pool)

### Step 2: Configure App Client
1. Click **"App integration"** tab
2. Scroll down to **"App client list"**
3. Find the app client ID: `3rdnl5ind8guti89jrbob85r4i`
4. Click on it to open settings

### Step 3: Add Hosted UI Configuration
1. Scroll down to **"Hosted UI"** section
2. Under **"Allowed callback URLs"**, add:
   ```
   http://localhost:5173/auth/callback
   ```
3. Under **"Allowed sign-out URLs"**, add:
   ```
   http://localhost:5173
   ```
4. Click **"Save changes"**

### Step 4: Verify OAuth Settings
Make sure these are enabled:
- ✅ **Allowed OAuth flows**: `Authorization code grant`
- ✅ **Allowed OAuth scopes**: `openid`, `profile`, `email`

### Step 5: Wait & Test
1. Wait 1-2 minutes for changes to propagate
2. Restart your frontend (if running)
3. Try signing in again at `http://localhost:5173`

## What This Fixes
- ✅ `400 Bad Request` error from Cognito
- ✅ Redirect to login page
- ✅ Failed token exchange

After configuration, the flow will work:
1. Click "Sign in with Cognito"
2. Redirects to AWS Cognito
3. After authentication, redirects back to `http://localhost:5173/auth/callback`
4. Token exchange succeeds
5. User is logged into dashboard

## Alternative: Check Current Configuration
If you have AWS CLI access:
```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-southeast-2_hTAYJId8y \
  --client-id 3rdnl5ind8guti89jrbob85r4i \
  --region ap-southeast-2
```

Look for `CallbackURLs` and `LogoutURLs` arrays.

