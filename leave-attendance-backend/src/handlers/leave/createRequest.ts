import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { LeaveService } from '../../services/leaveService';
import { successResponse } from '../../common/response';

const service = new LeaveService();

const bodySchema = z.object({
  policy_id: z.coerce.number().int().positive(),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
  half_day: z.coerce.boolean().optional(),
  reason: z.string().max(500).optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const payload = parseBody(bodySchema, event.body);

  const request = await service.createRequest(user, {
    policyId: payload.policy_id,
    startDate: payload.start_date,
    endDate: payload.end_date,
    halfDay: payload.half_day,
    reason: payload.reason,
    idempotencyKey: event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'],
  });

  return successResponse(201, request, origin);
});

