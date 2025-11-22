import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { BookingService } from '../../services/bookingService';
import { successResponse } from '../../common/response';
import { ForbiddenError } from '../../common/errors';

const service = new BookingService();

const querySchema = z.object({
  user_id: z.coerce.number().int().positive().optional(),
  room_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const query = parseQuery(querySchema, event.queryStringParameters);

  const isAdmin = user.roles.includes('ADMIN');
  const numericUserId =
    typeof user.userId === 'number' ? user.userId : Number(user.userId);

  if (!Number.isFinite(numericUserId)) {
    throw new ForbiddenError('Invalid authenticated user id');
  }

  // Non-admins can only see their own bookings
  if (!isAdmin && query.user_id && query.user_id !== numericUserId) {
    throw new ForbiddenError('You can only view your own bookings');
  }

  // Default to current user's ID when no user_id is provided (even for admins)
  // Admins can explicitly provide user_id to view another user's bookings
  const targetUserId = query.user_id ?? numericUserId;

  const filters = {
    userId: targetUserId,
    roomId: query.room_id,
    startDate: query.start_date,
    endDate: query.end_date,
    status: query.status,
  };

  const bookings = await service.listBookings(filters);

  return successResponse(200, { bookings }, origin);
});

