import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { successResponse } from '../../common/response';

const service = new RoomRepository();

const querySchema = z.object({
  date: z.string().optional(),
  capacity: z.string().regex(/^\d+$/).transform(Number).optional(),
  amenities: z.string().optional().transform((val) => (val ? val.split(',') : undefined)),
  active: z.string().transform((val) => val === 'true').optional(),
  location: z.string().optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const query = parseQuery(querySchema, event.queryStringParameters);

  const filters = {
    date: query.date,
    capacity: query.capacity,
    amenities: query.amenities,
    active: query.active,
    location: query.location,
  };

  const rooms = await service.search(filters);

  return successResponse(200, { rooms }, origin);
});

