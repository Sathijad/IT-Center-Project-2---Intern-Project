import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { BookingService } from '../../services/bookingService';
import { successResponse } from '../../common/response';

const service = new BookingService();

const pathSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(
    z.object({
      id: z.coerce.number().int().positive(),
    }),
    event.pathParameters,
  );

  const numericUserId =
    typeof user.userId === 'number' ? user.userId : Number(user.userId);

  const isAdmin = user.roles.includes('ADMIN');
  const booking = await service.cancelBooking(params.id, numericUserId, isAdmin);

  return successResponse(200, { booking }, origin);
});

