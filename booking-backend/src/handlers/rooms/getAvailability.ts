import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters, parseQuery } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { BookingRepository } from '../../repositories/bookingRepository';
import { successResponse } from '../../common/response';
import { ValidationError } from '../../common/errors';

const roomRepository = new RoomRepository();
const bookingRepository = new BookingRepository();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const querySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const handler = createHandler(async ({ event, user }) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(pathSchema, event.pathParameters);
  const query = parseQuery(querySchema, event.queryStringParameters);

  if (!query.start || !query.end) {
    throw new ValidationError('start and end query parameters are required (ISO 8601 format)');
  }

  const startTs = new Date(query.start);
  const endTs = new Date(query.end);

  if (endTs <= startTs) {
    throw new ValidationError('end must be after start');
  }

  // Check room exists
  await roomRepository.findByIdOrThrow(params.id);

  // Get bookings for the time range
  const bookings = await bookingRepository.search({
    roomId: params.id,
    startDate: query.start,
    endDate: query.end,
    status: 'CONFIRMED',
  });

  // Get blackouts
  const { BlackoutRepository } = await import('../../repositories/blackoutRepository');
  const blackoutRepository = new BlackoutRepository();
  const blackouts = await blackoutRepository.findByRoom(params.id, startTs, endTs);

  // Build availability timeline
  const availability = {
    roomId: params.id,
    start: startTs.toISOString(),
    end: endTs.toISOString(),
    bookings: bookings.map((b) => ({
      id: b.id,
      start: b.startTs.toISOString(),
      end: b.endTs.toISOString(),
      title: b.title,
    })),
    blackouts: blackouts.map((b) => ({
      id: b.id,
      start: b.startTs.toISOString(),
      end: b.endTs.toISOString(),
      reason: b.reason,
    })),
  };

  return successResponse(200, availability, origin);
});

