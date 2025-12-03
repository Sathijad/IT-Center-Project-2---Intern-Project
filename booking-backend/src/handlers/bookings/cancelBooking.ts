import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { BookingService } from '../../services/bookingService';
import { successResponse } from '../../common/response';

const service = new BookingService();

const pathSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(pathSchema, event.pathParameters);

  const numericUserId =
    typeof user.userId === 'number' ? user.userId : Number(user.userId);

  const isAdmin = user.roles.includes('ADMIN');
  const booking = await service.cancelBooking(params.id, numericUserId, isAdmin);

  if (!booking) {
    throw new Error('Booking cancellation failed - no booking returned');
  }

  // Enhance booking with room information
  const bookingWithRoom = booking as typeof booking & { roomName?: string | null; roomCapacity?: number | null; roomLocation?: string | null };
  const enhancedBooking = {
    ...booking,
    room: bookingWithRoom.roomName ? {
      id: booking.roomId,
      name: bookingWithRoom.roomName,
      capacity: bookingWithRoom.roomCapacity,
      location: bookingWithRoom.roomLocation,
    } : null,
  };

  return successResponse(200, { booking: enhancedBooking }, origin);
});

