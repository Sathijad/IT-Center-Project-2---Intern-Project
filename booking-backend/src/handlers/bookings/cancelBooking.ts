import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { BookingService } from '../../services/bookingService';
import { successResponse } from '../../common/response';

const service = new BookingService();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(pathSchema, event.pathParameters);

  const isAdmin = user.roles.includes('ADMIN');
  const booking = await service.cancelBooking(params.id, user.userId, isAdmin);

  return successResponse(200, { booking }, origin);
});

