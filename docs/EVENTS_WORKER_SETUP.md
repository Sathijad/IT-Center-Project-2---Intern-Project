# Events Broadcast Worker Setup Guide

## Overview

The Events Broadcast Worker is a separate process that:
1. Reads broadcast jobs from AWS SQS queue
2. Sends emails via AWS SES
3. Sends push notifications via FCM (when implemented)
4. Posts to Microsoft Teams (when configured)
5. Updates audit records in the database

---

## Architecture

```
Admin Web → Events API (8085) → SQS Queue → Broadcast Worker → SES/FCM/Teams
```

**Important:** The Events API only writes to SQS. The worker does the actual sending.

---

## Prerequisites

1. ✅ Events API is running and sending messages to SQS
2. ✅ AWS SQS queue is created and configured
3. ✅ AWS SES is set up with verified sender email
4. ✅ Database connection is accessible
5. ✅ AWS credentials are configured

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `EVENTS_DB_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `EVENTS_SQS_QUEUE_URL` | SQS queue URL | `https://sqs.ap-southeast-2.amazonaws.com/.../events-broadcast-queue` |
| `AWS_REGION` | AWS region | `ap-southeast-2` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |

### Email Configuration (if `EVENTS_EMAIL_ENABLED=true`)

| Variable | Description | Example |
|----------|-------------|---------|
| `EVENTS_SES_SENDER_EMAIL` | Verified SES sender email | `noreply@yourcompany.com` |

### Push Configuration (if `EVENTS_PUSH_ENABLED=true`)

| Variable | Description | Example |
|----------|-------------|---------|
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key | `AAAA...` |

### Teams Configuration (if `EVENTS_TEAMS_ENABLED=true`)

| Variable | Description | Example |
|----------|-------------|---------|
| `EVENTS_TEAMS_WEBHOOK_URL` | Microsoft Teams webhook URL | `https://outlook.office.com/webhook/...` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `EVENTS_EMAIL_ENABLED` | `true` | Enable email sending |
| `EVENTS_PUSH_ENABLED` | `true` | Enable push notifications |
| `EVENTS_TEAMS_ENABLED` | `true` | Enable Teams webhooks |

---

## Running the Worker

### Option 1: Docker Container

```powershell
docker run -d --name events-worker `
  -v "${PWD}:/app" `
  -w /app `
  -e EVENTS_DB_URL="postgres://postgres:password@itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com:5432/itcenter_auth?sslmode=require" `
  -e EVENTS_SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/144395889864/events-broadcast-queue" `
  -e EVENTS_SES_SENDER_EMAIL="noreply@yourcompany.com" `
  -e EVENTS_EMAIL_ENABLED="true" `
  -e EVENTS_PUSH_ENABLED="false" `
  -e EVENTS_TEAMS_ENABLED="false" `
  -e AWS_REGION="ap-southeast-2" `
  -e AWS_ACCESS_KEY_ID="your-access-key" `
  -e AWS_SECRET_ACCESS_KEY="your-secret-key" `
  golang:1.22 `
  go run ./cmd/broadcast-worker
```

### Option 2: Local Development

```bash
cd events-backend
export EVENTS_DB_URL="postgres://..."
export EVENTS_SQS_QUEUE_URL="https://sqs..."
export EVENTS_SES_SENDER_EMAIL="noreply@yourcompany.com"
export EVENTS_EMAIL_ENABLED="true"
export AWS_REGION="ap-southeast-2"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"

go run ./cmd/broadcast-worker
```

---

## How It Works

### 1. Worker Startup

1. Loads configuration from environment variables
2. Connects to PostgreSQL database
3. Initializes AWS SQS client
4. Initializes SES email sender (if enabled)
5. Initializes FCM push sender (if enabled)
6. Initializes Teams webhook sender (if enabled)
7. Starts polling SQS queue

### 2. Message Processing Loop

```
1. Receive messages from SQS (up to 5 at a time, wait 10 seconds)
2. For each message:
   a. Parse BroadcastMessage JSON
   b. Get event details from database
   c. For each channel (EMAIL, PUSH, TEAMS):
      - Send notification via appropriate service
      - Record audit entry (SUCCESS or FAILED)
   d. Mark event as broadcasted (if all channels succeeded)
   e. Delete message from SQS
3. Repeat
```

### 3. Email Sending

- Gets all user emails from `app_users` table
- Sends HTML email with event details
- Uses SES to send to all recipients
- Records delivery status in audit table

### 4. Error Handling

- If sending fails, records error in audit table
- Message is still deleted from SQS (to prevent infinite retries)
- Worker continues processing other messages
- Check audit table for delivery failures

---

## Testing

### 1. Test Worker Startup

```bash
docker logs events-worker --tail 50
```

Should see:
```
broadcast worker started
Configuration: Email=true, Push=false, Teams=false
SES email sender initialized with sender: noreply@yourcompany.com
```

### 2. Test Message Processing

1. Broadcast an event from admin web
2. Check worker logs:
   ```bash
   docker logs events-worker -f
   ```
3. Should see:
   ```
   Processing job: {eventId: "...", channels: ["EMAIL"]}
   ses.send_email: sender=noreply@... recipients=10
   ses.send_email.success: message_id=... recipients=10
   ```

### 3. Verify Email Delivery

- Check recipient inboxes
- Check SES console for send statistics
- Check audit table for delivery status

### 4. Check Audit Records

Go to Broadcast Audit page in admin web:
- Enter event UUID
- Click "Lookup"
- Should see audit entries with status "SENT" or "FAILED"

---

## Troubleshooting

### Worker not starting

**Error:** `EVENTS_SQS_QUEUE_URL is required for worker`
- **Fix:** Set the environment variable

**Error:** `db connect: ...`
- **Fix:** Check `EVENTS_DB_URL` is correct and database is accessible

**Error:** `aws config: ...`
- **Fix:** Check AWS credentials and region

### No messages being processed

**Check SQS queue:**
```bash
# In AWS Console, check if messages are in queue
# Or use AWS CLI:
aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/.../events-broadcast-queue \
  --attribute-names ApproximateNumberOfMessages
```

**Check worker logs:**
```bash
docker logs events-worker --tail 100
```

**Check API is sending:**
```bash
docker logs events-api --tail 100 | grep -i sqs
```

### Emails not being sent

**Error:** `EVENTS_SES_SENDER_EMAIL is required when email is enabled`
- **Fix:** Set the environment variable

**Error:** `failed to send email: AccessDenied`
- **Fix:** Check IAM permissions for SES

**Error:** `Email address not verified`
- **Fix:** Verify sender email in SES console

**Check SES status:**
- Go to AWS SES Console
- Check if sender email is verified
- Check if account is out of sandbox mode (if sending to unverified emails)

### Messages stuck in queue

**Possible causes:**
1. Worker is not running
2. Worker is crashing on message processing
3. SQS permissions issue

**Check:**
```bash
# Check if worker is running
docker ps | grep events-worker

# Check worker logs for errors
docker logs events-worker --tail 100

# Check SQS permissions
# Worker needs: sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes
```

---

## Monitoring

### Logs

```bash
# Follow worker logs
docker logs events-worker -f

# Check recent errors
docker logs events-worker --tail 100 | grep -i error
```

### Database Audit Table

Query the `publish_audit` table to see delivery status:

```sql
SELECT 
  event_id,
  channel,
  status,
  message,
  error_details,
  created_at
FROM publish_audit
ORDER BY created_at DESC
LIMIT 20;
```

### AWS CloudWatch

- SQS metrics: Messages received, messages deleted
- SES metrics: Emails sent, bounces, complaints

---

## Production Considerations

1. **Run multiple workers** for high availability
2. **Set up CloudWatch alarms** for failed deliveries
3. **Monitor SQS dead letter queue** (if configured)
4. **Rotate AWS credentials** regularly
5. **Use IAM roles** instead of access keys when possible
6. **Set up auto-scaling** based on queue depth

---

## Next Steps

1. ✅ Worker is implemented and ready
2. ⏳ Test with a real broadcast
3. ⏳ Monitor email delivery
4. ⏳ Implement FCM push notifications (when ready)
5. ⏳ Set up production monitoring

