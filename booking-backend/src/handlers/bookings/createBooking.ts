import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { BookingService } from '../../services/bookingService';
import { successResponse } from '../../common/response';

const service = new BookingService();

const bodySchema = z.object({
  room_id: z.number().int().positive(),
  start_ts: z.string().datetime(),
  end_ts: z.string().datetime(),
  title: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional(),
});

export const handler = createHandler(async ({ event, user, context }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const body = parseBody(bodySchema, event.body);

  // Get idempotency key from header
  const idempotencyKey = event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'] || undefined;

  // Convert to Date objects and validate
  const startTs = new Date(body.start_ts);
  const endTs = new Date(body.end_ts);

  // Validate Date objects are valid
  if (isNaN(startTs.getTime())) {
    throw new Error(`Invalid start_ts: ${body.start_ts}`);
  }
  if (isNaN(endTs.getTime())) {
    throw new Error(`Invalid end_ts: ${body.end_ts}`);
  }

  // Ensure userId is a valid number (convert if string)
  const userId = typeof user.userId === 'number' ? user.userId : Number(user.userId);
  if (isNaN(userId) || !Number.isFinite(userId) || userId <= 0) {
    throw new Error(`Invalid userId: ${user.userId}`);
  }

  const result = await service.createBooking({
    roomId: body.room_id,
    userId: userId,
    startTs,
    endTs,
    title: body.title || null,
    attendees: body.attendees || [],
    idempotencyKey: idempotencyKey || null,
  });

  const statusCode = result.isNew ? 201 : 200;

  return successResponse(statusCode, { booking: result.booking }, origin);
});

