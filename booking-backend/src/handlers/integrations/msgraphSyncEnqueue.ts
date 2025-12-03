import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { MsGraphBookingService } from '../../services/msGraphBookingService';
import { BookingRepository } from '../../repositories/bookingRepository';
import { successResponse } from '../../common/response';
import { ForbiddenError } from '../../common/errors';

const graphService = new MsGraphBookingService();
const bookingRepository = new BookingRepository();

const bodySchema = z.object({
  booking_id: z.number().int().positive().optional(),
  action: z.enum(['create', 'update', 'delete', 'full_sync']).optional(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    if (!user) {
      throw new Error('User context missing');
    }

    const origin = event.headers?.origin || event.headers?.Origin;
    const body = parseBody(bodySchema, event.body);

    // Only ADMIN can trigger sync jobs
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenError('Only administrators can trigger sync jobs');
    }

    if (body.booking_id && body.action && body.action !== 'full_sync') {
      // Sync specific booking
      const booking = await bookingRepository.findById(body.booking_id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      await graphService.enqueueBookingSync(body.booking_id, body.action);
      
      return successResponse(
        202,
        {
          message: 'Sync job enqueued',
          bookingId: body.booking_id,
          action: body.action,
        },
        origin,
      );
    } else if (body.action === 'full_sync') {
      // Full sync - enqueue all confirmed bookings
      // This is a simplified version - in production, you'd want pagination
      const bookings = await bookingRepository.search({ status: 'CONFIRMED' });
      
      const jobs = await Promise.all(
        bookings.map((booking) => graphService.enqueueBookingSync(booking.id, 'update')),
      );

      return successResponse(
        202,
        {
          message: 'Full sync job enqueued',
          bookingsCount: bookings.length,
        },
        origin,
      );
    } else {
      throw new Error('Either booking_id+action or action=full_sync required');
    }
  },
  { allowedRoles: 'ADMIN' },
);

