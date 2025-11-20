import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { BookingRepository } from '../repositories/bookingRepository';
import { RoomRepository } from '../repositories/roomRepository';
import { ApplicationError } from '../common/errors';
import { logger } from '../common/logger';

interface BookingSyncMessage {
  bookingId: number;
  action: 'create' | 'update' | 'delete';
  attempt?: number;
}

const isFifoQueue = (queueUrl: string): boolean => queueUrl.endsWith('.fifo');
const isCalendarSyncEnabled = (): boolean => process.env.CALENDAR_SYNC_ENABLED?.toLowerCase() === 'true';

export class MsGraphBookingService {
  private readonly sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

  constructor(
    private readonly bookingRepository = new BookingRepository(),
    private readonly roomRepository = new RoomRepository(),
  ) {}

  async enqueueBookingSync(bookingId: number, action: 'create' | 'update' | 'delete'): Promise<void> {
    if (!isCalendarSyncEnabled()) {
      logger.info('Calendar sync disabled, skipping enqueue', { bookingId, action });
      return;
    }

    const queueUrl = process.env.BOOKING_SYNC_QUEUE_URL;
    if (!queueUrl) {
      throw new ApplicationError('QUEUE_NOT_CONFIGURED', 'Booking sync queue URL is not configured', 500);
    }

    const message: BookingSyncMessage = { bookingId, action, attempt: 1 };

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      ...(isFifoQueue(queueUrl)
        ? {
            MessageGroupId: `booking-${bookingId}`,
            MessageDeduplicationId: `booking-${bookingId}-${action}-${Date.now()}`,
          }
        : {}),
    });

    await this.sqsClient.send(command);
    logger.info('Enqueued booking sync', { bookingId, action });
  }

  async syncBooking(bookingId: number, action: 'create' | 'update' | 'delete'): Promise<void> {
    if (!isCalendarSyncEnabled()) {
      logger.info('Calendar sync disabled, skipping sync', { bookingId, action });
      return;
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApplicationError('BOOKING_NOT_FOUND', 'Booking not found', 404);
    }

    if (action === 'delete') {
      // Delete from Graph if external_event_id exists
      if (booking.externalEventId) {
        await this.deleteGraphEvent(booking.externalEventId);
        logger.info('Deleted booking from Graph', { bookingId, externalEventId: booking.externalEventId });
      }
      return;
    }

    if (booking.status !== 'CONFIRMED') {
      logger.info('Booking not confirmed, skipping sync', { bookingId, status: booking.status });
      return;
    }

    const room = await this.roomRepository.findById(booking.roomId);
    if (!room) {
      throw new ApplicationError('ROOM_NOT_FOUND', 'Room not found', 404);
    }

    const tenantId = process.env.GRAPH_TENANT;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;
    const scope = process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) {
      throw new ApplicationError('GRAPH_CONFIG_MISSING', 'Microsoft Graph credentials not configured', 500);
    }

    // Get access token
    const accessToken = await this.getAccessToken(tenantId, clientId, clientSecret, scope);

    // Get room calendar (or user calendar if room doesn't have one)
    const calendarId = room.externalCalendarId || `rooms/${room.id}`;

    if (action === 'create' || action === 'update') {
      const eventId = await this.upsertGraphEvent(accessToken, calendarId, booking, room);
      
      // Update booking with external_event_id if not set
      if (!booking.externalEventId && eventId) {
        await this.bookingRepository.update(bookingId, { externalEventId: eventId });
      }
    }
  }

  private async getAccessToken(tenantId: string, clientId: string, clientSecret: string, scope: string): Promise<string> {
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

    return accessToken;
  }

  private async upsertGraphEvent(
    accessToken: string,
    calendarId: string,
    booking: Awaited<ReturnType<BookingRepository['findById']>>,
    room: Awaited<ReturnType<RoomRepository['findById']>>,
  ): Promise<string | null> {
    if (!booking) {
      return null;
    }

    const eventUrl = booking.externalEventId
      ? `https://graph.microsoft.com/v1.0/${calendarId}/events/${booking.externalEventId}`
      : `https://graph.microsoft.com/v1.0/${calendarId}/events`;

    const eventData = {
      subject: booking.title || `Room Booking - ${room?.name || 'Unknown'}`,
      body: {
        contentType: 'HTML',
        content: `Room: ${room?.name || 'Unknown'}<br/>Attendees: ${booking.attendees?.join(', ') || 'None'}`,
      },
      start: {
        dateTime: booking.startTs.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: booking.endTs.toISOString(),
        timeZone: 'UTC',
      },
      attendees: booking.attendees?.map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      })) || [],
    };

    const method = booking.externalEventId ? 'PATCH' : 'POST';
    const response = await fetch(eventUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApplicationError('GRAPH_EVENT_ERROR', errorText, response.status);
    }

    const event = (await response.json()) as { id: string };
    return event.id;
  }

  private async deleteGraphEvent(externalEventId: string): Promise<void> {
    const tenantId = process.env.GRAPH_TENANT;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;
    const scope = process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) {
      throw new ApplicationError('GRAPH_CONFIG_MISSING', 'Microsoft Graph credentials not configured', 500);
    }

    const accessToken = await this.getAccessToken(tenantId, clientId, clientSecret, scope);

    // Note: This is a simplified version - in production, you'd need to track which calendar the event belongs to
    // For now, we'll try to delete from a common calendar endpoint
    const deleteUrl = `https://graph.microsoft.com/v1.0/me/calendar/events/${externalEventId}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new ApplicationError('GRAPH_DELETE_ERROR', errorText, response.status);
    }
  }
}

