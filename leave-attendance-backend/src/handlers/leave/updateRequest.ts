import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody, parsePathParameters } from '../../common/validation';
import { LeaveService } from '../../services/leaveService';
import { successResponse } from '../../common/response';

const service = new LeaveService();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a number'),
});

const bodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
  notes: z.string().max(500).optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(pathSchema, event.pathParameters);
  const payload = parseBody(bodySchema, event.body);

  const requestId = Number(params.id);

  const updated = await service.updateRequest(user, {
    requestId,
    action: payload.action,
    notes: payload.notes,
  });

  return successResponse(200, updated, origin);
});

