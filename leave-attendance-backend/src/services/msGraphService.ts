import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LeaveRepository } from '../repositories/leaveRepository';
import { ApplicationError } from '../common/errors';
import { logger } from '../common/logger';

interface CalendarSyncMessage {
  requestId: number;
  attempt?: number;
}

const isFifoQueue = (queueUrl: string): boolean => queueUrl.endsWith('.fifo');
const isCalendarSyncEnabled = (): boolean => process.env.CALENDAR_SYNC_ENABLED?.toLowerCase() === 'true';

export class MsGraphService {
  private readonly sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

  constructor(private readonly leaveRepository = new LeaveRepository()) {}

  async enqueueCalendarSync(requestId: number): Promise<void> {
    if (!isCalendarSyncEnabled()) {
      logger.info('Calendar sync disabled, skipping enqueue', { requestId });
      return;
    }

    const queueUrl = process.env.CALENDAR_SYNC_QUEUE_URL;
    if (!queueUrl) {
      throw new ApplicationError('QUEUE_NOT_CONFIGURED', 'Calendar sync queue URL is not configured', 500);
    }

    const message: CalendarSyncMessage = { requestId, attempt: 1 };

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      ...(isFifoQueue(queueUrl)
        ? {
            MessageGroupId: `leave-${requestId}`,
            MessageDeduplicationId: `leave-${requestId}-${Date.now().toString()}`,
          }
        : {}),
    });

    await this.sqsClient.send(command);
    logger.info('Enqueued calendar sync', { requestId });
  }

  async syncLeaveRequest(requestId: number): Promise<void> {
    if (!isCalendarSyncEnabled()) {
      logger.info('Calendar sync disabled, skipping sync', { requestId });
      return;
    }

    const leaveRequest = await this.leaveRepository.getLeaveRequestById(requestId);
    if (!leaveRequest || leaveRequest.status !== 'APPROVED') {
      throw new ApplicationError('LEAVE_NOT_APPROVED', 'Leave request is not approved', 409);
    }

    const tenantId = process.env.GRAPH_TENANT;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;
    const scope = process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) {
      throw new ApplicationError('GRAPH_CONFIG_MISSING', 'Microsoft Graph credentials not configured', 500);
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new ApplicationError('GRAPH_TOKEN_ERROR', errorText, tokenResponse.status);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new ApplicationError('GRAPH_TOKEN_ERROR', 'Access token missing from response', 500);
    }

    const eventResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${leaveRequest.userEmail}/calendar/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: `Leave: ${leaveRequest.policyName}`,
        body: {
          contentType: 'HTML',
          content: leaveRequest.reason ?? 'Leave request',
        },
        start: {
          dateTime: `${leaveRequest.startDate}T00:00:00`,
          timeZone: 'UTC',
        },
        end: {
          dateTime: `${leaveRequest.endDate}T23:59:59`,
          timeZone: 'UTC',
        },
        isAllDay: !leaveRequest.halfDay,
      }),
    });

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      throw new ApplicationError('GRAPH_EVENT_ERROR', errorText, eventResponse.status);
    }

    const event = (await eventResponse.json()) as { id: string };
    await this.leaveRepository.updateGraphEventId(requestId, event.id);
    logger.info('Leave request synced to Microsoft Graph', { requestId, eventId: event.id });
  }
}

