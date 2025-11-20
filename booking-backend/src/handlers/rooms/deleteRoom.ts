import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { BookingRepository } from '../../repositories/bookingRepository';
import { successResponse } from '../../common/response';
import { ApplicationError } from '../../common/errors';

const roomRepository = new RoomRepository();
const bookingRepository = new BookingRepository();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const params = parsePathParameters(pathSchema, event.pathParameters);

    // Check for existing bookings
    const bookings = await bookingRepository.search({ roomId: params.id, status: 'CONFIRMED' });
    if (bookings.length > 0) {
      throw new ApplicationError(
        'ROOM_HAS_BOOKINGS',
        'Cannot delete room with existing bookings',
        400,
        { bookingCount: bookings.length },
      );
    }

    // For now, we'll deactivate instead of delete (soft delete)
    const room = await roomRepository.update(params.id, { active: false });

    return successResponse(200, { room, message: 'Room deactivated' }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

