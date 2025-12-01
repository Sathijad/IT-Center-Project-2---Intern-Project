# Events & Announcements - Status Workflow & Broadcast Guide

## Event Status Workflow

Events go through a lifecycle with different statuses. Here's what each status means:

### Status Flow

```
DRAFT → PENDING_MODERATION → APPROVED → SCHEDULED → PUBLISHED
                                    ↓
                                REJECTED
```

### Status Descriptions

1. **DRAFT** (Not shown in filters)
   - Event is being created or edited
   - Not yet submitted for review
   - Only visible to the creator

2. **PENDING_MODERATION** (Filter: "Pending")
   - Event has been created and is waiting for admin approval
   - Shows up in the Moderation Queue
   - Admin can approve or reject it

3. **APPROVED** (Filter: "Approved")
   - Admin has reviewed and approved the event
   - Event is ready to be broadcasted
   - Can now be scheduled or published immediately

4. **REJECTED** (Not shown in filters)
   - Admin rejected the event
   - Event will not be published
   - Creator can edit and resubmit

5. **SCHEDULED** (Filter: "Scheduled")
   - Event has a future scheduled time
   - Will be automatically published at the scheduled time
   - Can be broadcasted manually before scheduled time

6. **PUBLISHED** (Filter: "Published")
   - Event has been broadcasted to users
   - Users can see it in the mobile app feed
   - Email and push notifications have been sent

### Filter Tabs Explained

- **All**: Shows events in all statuses (except DRAFT and REJECTED)
- **Pending**: Shows events waiting for admin approval (PENDING_MODERATION)
- **Approved**: Shows events that have been approved but not yet published
- **Scheduled**: Shows events with a future scheduled time
- **Published**: Shows events that have been broadcasted to users

## Broadcast Feature

### What is Broadcasting?

Broadcasting sends event announcements to users through multiple channels:
- **📧 Email**: Sends event details via email to all users
- **📱 Push Notification**: Sends notification to mobile app users
- **💬 Teams**: Posts to Microsoft Teams channel (if configured)

### How to Broadcast an Event

1. **Create/Edit Event**
   - Go to Events page → Click "New Event" or edit an existing event
   - Fill in event details (title, summary, body, etc.)
   - Save the event

2. **Approve Event** (if needed)
   - Go to Moderation page
   - Find your event in the "Pending" list
   - Click "Approve"
   - Event status changes to "APPROVED"

3. **Broadcast Event**
   - Go back to the event edit page
   - Click the **"📢 Broadcast Event"** button (only visible for approved events)
   - Select channels:
     - ✅ Email - Send to all users via email
     - ✅ Push Notification - Send to mobile app users
     - ✅ Teams - Post to Teams channel
   - Click "Broadcast"
   - Users will receive emails and mobile notifications!

### Broadcast Requirements

- Event must be in **APPROVED** status
- At least one channel must be selected
- Event must be saved first

### What Happens When You Broadcast?

1. **Immediate Actions**:
   - Event status changes to **PUBLISHED**
   - Broadcast request is queued
   - Audit record is created

2. **Background Processing**:
   - Email service sends emails to all users with event details
   - Push notification service sends notifications to mobile app users
   - Teams integration posts to configured Teams channel

3. **Audit Trail**:
   - Each broadcast attempt is logged
   - View broadcast history in "Broadcast Audit" page
   - See delivery status for each channel

### Viewing Broadcast Results

1. Go to **Broadcast Audit** page (`/events/audit`)
2. Enter the Event UUID (found in the event edit page URL)
3. Click "Lookup"
4. See delivery status for each channel:
   - ✅ Success - Email/notification sent successfully
   - ❌ Failed - Error message shows what went wrong
   - ⏳ Queued - Broadcast is being processed

## Best Practices

1. **Create → Approve → Broadcast**: Follow this workflow for important announcements
2. **Use Scheduling**: For future events, set a scheduled time instead of broadcasting immediately
3. **Check Audit Logs**: Always verify broadcast success in the audit page
4. **Test First**: Create a test event to verify email and push notifications work

## Troubleshooting

- **Broadcast button not showing?** → Event must be approved first
- **No emails received?** → Check Broadcast Audit page for error messages
- **Push notifications not working?** → Verify mobile app has notification permissions
- **Event not in feed?** → Ensure event status is PUBLISHED and has PUBLISHED status filter

