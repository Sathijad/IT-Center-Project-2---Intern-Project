import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters, parseBody } from '../../common/validation';
import { BlackoutService } from '../../services/blackoutService';
import { successResponse } from '../../common/response';

const service = new BlackoutService();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const bodySchema = z.object({
  start_ts: z.string().datetime().optional(),
  end_ts: z.string().datetime().optional(),
  reason: z.string().optional().nullable(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const params = parsePathParameters(pathSchema, event.pathParameters);
    const body = parseBody(bodySchema, event.body);

    const updates: {
      startTs?: Date;
      endTs?: Date;
      reason?: string | null;
    } = {};

    if (body.start_ts) {
      updates.startTs = new Date(body.start_ts);
    }
    if (body.end_ts) {
      updates.endTs = new Date(body.end_ts);
    }
    if (body.reason !== undefined) {
      updates.reason = body.reason;
    }

    const blackout = await service.updateBlackout(params.id, updates);

    return successResponse(200, { blackout }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

