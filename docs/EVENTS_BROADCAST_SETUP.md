# Events Broadcast Setup Guide

This document explains how to set up all the infrastructure components needed for the Events & Announcements broadcast feature.

## Overview

When an admin clicks "Broadcast Event", the system:
1. Validates the event is APPROVED
2. Sends a message to AWS SQS queue
3. A worker processes the message and sends notifications via:
   - Email (AWS SES)
   - Push notifications (FCM/APNs)
   - Microsoft Teams (via Webhook)

---

## ✅ Changes Made to Events Backend

### 1. SQS Queue URL is Now Required

**File:** `events-backend/cmd/api/main.go`

- Changed from optional to **required**
- API will fail to start if `EVENTS_SQS_QUEUE_URL` is not set
- This ensures misconfiguration is caught immediately

### 2. Event Status Validation Added

**File:** `events-backend/internal/http/router.go`

- Broadcast handler now validates event status
- Only `APPROVED` events can be broadcasted
- Returns 400 error if event is not approved

### 3. SQS Message Format

The message sent to SQS matches this structure:

```json
{
  "eventId": "uuid-here",
  "channels": ["EMAIL", "PUSH", "TEAMS"],
  "idempotencyKey": "uuid-here",
  "requestedBy": 123,
  "requestedAt": "2024-01-01T00:00:00Z"
}
```

---

## 🔧 Infrastructure Setup

### 1. AWS SQS Queue Setup

#### Step 1: Create SQS Queue in AWS Console

1. Go to AWS Console → SQS
2. Click "Create queue"
3. Choose **Standard** queue type
4. Name: `events-broadcast-queue`
5. Region: `ap-southeast-2`
6. Leave other settings as default
7. Click "Create queue"

#### Step 2: Get Queue URL

After creation, copy the Queue URL:
```
https://sqs.ap-southeast-2.amazonaws.com/YOUR_ACCOUNT_ID/events-broadcast-queue
```

#### Step 3: Configure IAM Permissions

Create an IAM policy for the events API:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueUrl"
      ],
      "Resource": "arn:aws:sqs:ap-southeast-2:YOUR_ACCOUNT_ID:events-broadcast-queue"
    }
  ]
}
```

Attach this policy to:
- EC2 instance role (if running on EC2)
- ECS task role (if running on ECS)
- Or the IAM user/role used by the application

#### Step 4: Set Environment Variable

Add to your events API container:

```bash
EVENTS_SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/YOUR_ACCOUNT_ID/events-broadcast-queue
```

---

### 2. AWS SES (Simple Email Service) Setup

#### Step 1: Verify Email Domain or Email Address

**For Production (Domain):**
1. Go to AWS Console → SES → Verified identities
2. Click "Create identity"
3. Choose "Domain"
4. Enter your domain (e.g., `yourcompany.com`)
5. Follow DNS verification steps
6. Add the provided DNS records to your domain

**For Development (Email):**
1. Go to AWS Console → SES → Verified identities
2. Click "Create identity"
3. Choose "Email address"
4. Enter your email
5. Click verification link sent to your email

#### Step 2: Request Production Access (if needed)

- By default, SES is in "Sandbox" mode
- Can only send to verified email addresses
- To send to any email, request production access in SES console

#### Step 3: Configure IAM Permissions

Create IAM policy for worker:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Step 4: Set Environment Variables for Worker

```bash
EVENTS_EMAIL_ENABLED=true
EVENTS_SES_ENDPOINT=https://email.ap-southeast-2.amazonaws.com
AWS_SES_FROM_EMAIL=noreply@yourcompany.com
```

---

### 3. Firebase Cloud Messaging (FCM) for Push Notifications

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `it-center-events`
4. Follow setup wizard

#### Step 2: Add Android App

1. In Firebase Console, click "Add app" → Android
2. Package name: `com.yourcompany.itcenter` (match your mobile app)
3. Download `google-services.json`
4. Place in `mobile-app/android/app/`

#### Step 3: Add iOS App

1. Click "Add app" → iOS
2. Bundle ID: `com.yourcompany.itcenter` (match your mobile app)
3. Download `GoogleService-Info.plist`
4. Place in `mobile-app/ios/Runner/`

#### Step 4: Get Server Key

1. Go to Project Settings → Cloud Messaging
2. Copy "Server key" (for FCM HTTP API)
3. Or download service account JSON (for FCM Admin SDK)

#### Step 5: Set Environment Variables for Worker

```bash
EVENTS_PUSH_ENABLED=true
FCM_SERVER_KEY=your-server-key-here
# OR
FCM_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
```

#### Step 6: Update Mobile App

The mobile app already has Amplify configured. You may need to add FCM plugin if not already done.

---

### 4. Apple Push Notification Service (APNs) Setup

#### Step 1: Create APNs Certificate or Key

**Option A: Certificate (Legacy)**
1. Go to Apple Developer Portal → Certificates
2. Create "Apple Push Notification service SSL (Sandbox & Production)"
3. Download certificate
4. Convert to .p12 format

**Option B: Key (Recommended)**
1. Go to Apple Developer Portal → Keys
2. Create new key with "Apple Push Notifications service (APNs)" enabled
3. Download `.p8` key file
4. Note the Key ID and Team ID

#### Step 2: Set Environment Variables for Worker

For Key method (recommended):
```bash
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_KEY_PATH=/path/to/AuthKey_KEYID.p8
APNS_BUNDLE_ID=com.yourcompany.itcenter
APNS_TOPIC=com.yourcompany.itcenter
```

For Certificate method:
```bash
APNS_CERT_PATH=/path/to/cert.p12
APNS_CERT_PASSWORD=your-password
APNS_BUNDLE_ID=com.yourcompany.itcenter
```

---

### 5. Microsoft Teams Webhook Setup

#### Step 1: Create Incoming Webhook in Teams

1. Open Microsoft Teams
2. Go to the channel where you want notifications
3. Click "⋯" (more options) → Connectors
4. Search for "Incoming Webhook"
5. Click "Configure"
6. Name it: "Events Broadcast"
7. Copy the webhook URL

#### Step 2: Set Environment Variable

```bash
EVENTS_TEAMS_ENABLED=true
EVENTS_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR_WEBHOOK_ID/...
```

---

## 🚀 Running the Services

### Events API (Already Updated)

```bash
docker run -d --name events-api \
  -v "${PWD}:/app" \
  -w /app \
  -p 8085:8080 \
  -e EVENTS_DB_URL="postgres://postgres:password@itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com:5432/itcenter_auth?sslmode=require" \
  -e EVENTS_JWKS_URL="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json" \
  -e EVENTS_JWT_ISSUER="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y" \
  -e EVENTS_JWT_AUDIENCE="3rdnl5ind8guti89jrbob85r4i" \
  -e EVENTS_ALLOWED_ORIGINS="*" \
  -e EVENTS_SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/144395889864/events-broadcast-queue" \
  -e AWS_REGION="ap-southeast-2" \
  -e AWS_ACCESS_KEY_ID="your-access-key" \
  -e AWS_SECRET_ACCESS_KEY="your-secret-key" \
  golang:1.22 \
  go run ./cmd/api
```

### Broadcast Worker (To Be Implemented)

```bash
docker run -d --name events-broadcast-worker \
  -v "${PWD}:/app" \
  -w /app \
  -e EVENTS_DB_URL="postgres://..." \
  -e EVENTS_SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/..." \
  -e EVENTS_EMAIL_ENABLED=true \
  -e EVENTS_PUSH_ENABLED=true \
  -e EVENTS_TEAMS_ENABLED=true \
  -e EVENTS_SES_ENDPOINT="https://email.ap-southeast-2.amazonaws.com" \
  -e FCM_SERVER_KEY="your-fcm-key" \
  -e EVENTS_TEAMS_WEBHOOK_URL="https://..." \
  -e AWS_REGION="ap-southeast-2" \
  -e AWS_ACCESS_KEY_ID="your-access-key" \
  -e AWS_SECRET_ACCESS_KEY="your-secret-key" \
  golang:1.22 \
  go run ./cmd/broadcast-worker
```

---

## 📋 Environment Variables Summary

### Events API

| Variable | Required | Description |
|----------|----------|-------------|
| `EVENTS_SQS_QUEUE_URL` | ✅ Yes | SQS queue URL for broadcast jobs |
| `AWS_REGION` | ✅ Yes | AWS region (e.g., `ap-southeast-2`) |
| `AWS_ACCESS_KEY_ID` | ✅ Yes | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | AWS credentials |

### Broadcast Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `EVENTS_DB_URL` | ✅ Yes | PostgreSQL connection string |
| `EVENTS_SQS_QUEUE_URL` | ✅ Yes | SQS queue URL to consume from |
| `EVENTS_EMAIL_ENABLED` | No | Enable email (default: `true`) |
| `EVENTS_PUSH_ENABLED` | No | Enable push (default: `true`) |
| `EVENTS_TEAMS_ENABLED` | No | Enable Teams (default: `true`) |
| `EVENTS_SES_ENDPOINT` | If email enabled | SES endpoint URL |
| `FCM_SERVER_KEY` | If push enabled | Firebase server key |
| `EVENTS_TEAMS_WEBHOOK_URL` | If Teams enabled | Teams webhook URL |
| `AWS_REGION` | ✅ Yes | AWS region |
| `AWS_ACCESS_KEY_ID` | ✅ Yes | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | AWS credentials |

---

## 🧪 Testing the Setup

### 1. Test SQS Connection

```bash
# Send a test message to SQS
aws sqs send-message \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/YOUR_ACCOUNT_ID/events-broadcast-queue \
  --message-body '{"eventId":"test-123","channels":["EMAIL"]}'
```

### 2. Test Broadcast API

1. Create an event via admin web
2. Approve it in Moderation page
3. Click "Broadcast Event"
4. Check SQS queue in AWS Console - should see a message
5. Check Broadcast Audit page - should show "QUEUED" status

### 3. Test Worker

Once worker is implemented:
1. Worker should pick up message from SQS
2. Process each channel (EMAIL, PUSH, TEAMS)
3. Update audit records with delivery status
4. Delete message from SQS

---

## 📝 Next Steps

1. ✅ **SQS Setup** - Create queue and configure API (DONE)
2. ⏳ **Implement Worker** - Create worker that consumes from SQS
3. ⏳ **Implement Email Sender** - Add SES email sending to worker
4. ⏳ **Implement Push Sender** - Add FCM/APNs sending to worker
5. ⏳ **Implement Teams Sender** - Add Teams webhook posting to worker

---

## 🔍 Troubleshooting

### API fails to start with "EVENTS_SQS_QUEUE_URL is required"

- Make sure the environment variable is set
- Check docker run command includes `-e EVENTS_SQS_QUEUE_URL=...`

### Broadcast returns "event must be approved"

- Event must be in `APPROVED` status
- Go to Moderation page and approve the event first

### Messages not appearing in SQS

- Check AWS credentials are correct
- Verify IAM permissions include `sqs:SendMessage`
- Check CloudWatch logs for errors

### Worker not processing messages

- Ensure worker is running
- Check SQS queue permissions (worker needs `sqs:ReceiveMessage`, `sqs:DeleteMessage`)
- Verify queue URL matches between API and worker

---

## 📚 Additional Resources

- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Microsoft Teams Webhooks](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)

