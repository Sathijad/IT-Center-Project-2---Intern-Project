import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { AttendanceService } from '../../services/attendanceService';
import { successResponse } from '../../common/response';

const service = new AttendanceService();

const bodySchema = z.object({
  timestamp: z.string().optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const payload = parseBody(bodySchema, event.body ?? '{}');

  const log = await service.clockOut(user, {
    timestamp: payload.timestamp,
    idempotencyKey: event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'],
  });

  return successResponse(200, log, origin);
});

