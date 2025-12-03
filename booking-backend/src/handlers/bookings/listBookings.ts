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

  // For admins: show all bookings when no user_id is provided
  // For non-admins: always filter by their own user_id
  // When user_id is explicitly provided, use it (admins viewing specific user)
  const targetUserId = isAdmin 
    ? query.user_id  // Admins: undefined means show all, or specific user_id
    : (query.user_id ?? numericUserId);  // Non-admins: always their own id

  const filters = {
    ...(targetUserId !== undefined ? { userId: targetUserId } : {}),  // Only set userId if provided
    ...(query.room_id !== undefined ? { roomId: query.room_id } : {}),
    ...(query.start_date ? { startDate: query.start_date } : {}),
    ...(query.end_date ? { endDate: query.end_date } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const bookings = await service.listBookings(filters);

  // Enhance bookings with room information
  const bookingsWithRoomInfo = bookings.map((booking) => {
    const bookingWithRoom = booking as typeof booking & { roomName?: string | null; roomCapacity?: number | null; roomLocation?: string | null };
    return {
      ...booking,
      room: bookingWithRoom.roomName ? {
        id: booking.roomId,
        name: bookingWithRoom.roomName,
        capacity: bookingWithRoom.roomCapacity,
        location: bookingWithRoom.roomLocation,
      } : null,
    };
  });

  return successResponse(200, { bookings: bookingsWithRoomInfo }, origin);
});

