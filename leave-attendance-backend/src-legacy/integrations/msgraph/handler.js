import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { db } from '../../config/database.js';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const queueUrl = process.env.CALENDAR_SYNC_QUEUE_URL;

export const handler = async (event) => {
  console.log('Calendar sync handler triggered', JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { request_id } = message;

      if (!request_id) {
        console.error('Missing request_id in message');
        continue;
      }

      // Get leave request details
      const requestResult = await db.query(`
        SELECT 
          lr.request_id,
          lr.user_id,
          u.email,
          u.display_name,
          lr.start_date,
          lr.end_date,
          lr.status
        FROM leave_requests lr
        JOIN app_users u ON lr.user_id = u.id
        WHERE lr.request_id = $1 AND lr.status = 'APPROVED'
      `, [request_id]);

      if (requestResult.rows.length === 0) {
        console.log(`Leave request ${request_id} not found or not approved`);
        continue;
      }

      const leaveRequest = requestResult.rows[0];

      // Only sync if calendar sync is enabled
      if (process.env.CALENDAR_SYNC_ENABLED !== 'true') {
        console.log('Calendar sync is disabled');
        continue;
      }

      // Call Microsoft Graph API to create calendar event
      await syncToMicrosoftGraph(leaveRequest);

      console.log(`Successfully synced leave request ${request_id} to calendar`);
    } catch (error) {
      console.error('Error processing calendar sync:', error);
      // Don't throw - allow other messages to be processed
    }
  }
};

async function syncToMicrosoftGraph(leaveRequest) {
  const accessToken = await getMicrosoftGraphToken();

  const eventData = {
    subject: `Leave: ${leaveRequest.display_name}`,
    body: {
      contentType: 'HTML',
      content: `Leave request for ${leaveRequest.display_name}`,
    },
    start: {
      dateTime: `${leaveRequest.start_date}T00:00:00`,
      timeZone: 'UTC',
    },
    end: {
      dateTime: `${leaveRequest.end_date}T23:59:59`,
      timeZone: 'UTC',
    },
    isAllDay: true,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${leaveRequest.email}/calendar/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getMicrosoftGraphToken() {
  const tenantId = process.env.MSGRAPH_TENANT_ID;
  const clientId = process.env.MSGRAPH_CLIENT_ID;
  const clientSecret = process.env.MSGRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

