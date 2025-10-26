# AWS Cognito Configuration Guide

## Problem: redirect_mismatch Error

This error occurs when the redirect URI used by your application doesn't match the allowed redirect URIs configured in AWS Cognito.

## Solution: Configure Redirect URIs in Cognito

You need to add the following redirect URIs to your Cognito User Pool:

1. **Allowed callback URLs:**
   ```
   http://localhost:5173/auth/callback
   ```

2. **Allowed sign-out URLs:**
   ```
   http://localhost:5173
   ```

## Step-by-Step Instructions

### 1. Log in to AWS Console
- Go to https://console.aws.amazon.com
- Navigate to AWS Cognito service

### 2. Select Your User Pool
- Pool ID: `ap-southeast-2_hTAYJId8y`
- Region: `ap-southeast-2`

### 3. Configure App Client Settings
- Go to **App integration** → **App client list**
- Click on your app client ID: `3rdnl5ind8guti89jrbob85r4i`

### 4. Add Callback and Sign-out URLs

**Under "Hosted UI" section, add:**

**Allowed callback URLs:**
```
http://localhost:5173/auth/callback
```

**Allowed sign-out URLs:**
```
http://localhost:5173
```

### 5. Configure OAuth Flows
Make sure these OAuth flows are enabled:
- ✅ Authorization code grant
- ✅ OpenID Connect

### 6. Configure OAuth Scopes
Make sure these scopes are selected:
- ✅ openid
- ✅ profile
- ✅ email

## Current Configuration in Code

The application is configured to use:
- **Callback URL:** `http://localhost:5173/auth/callback`
- **Sign-out URL:** `http://localhost:5173`
- **Client ID:** `3rdnl5ind8guti89jrbob85r4i`
- **User Pool ID:** `ap-southeast-2_hTAYJId8y`

## After Configuration

1. Save your changes in AWS Console
2. Wait 1-2 minutes for changes to propagate
3. Restart your frontend application
4. Try signing in again

## Alternative: If You Don't Have AWS Access

If you don't have access to the AWS Console, contact the project administrator to add these URLs to the Cognito configuration.

