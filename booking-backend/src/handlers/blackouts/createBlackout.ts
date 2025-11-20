import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { BlackoutService } from '../../services/blackoutService';
import { successResponse } from '../../common/response';

const service = new BlackoutService();

const bodySchema = z.object({
  room_id: z.number().int().positive(),
  start_ts: z.string().datetime(),
  end_ts: z.string().datetime(),
  reason: z.string().optional().nullable(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    if (!user) {
      throw new Error('User context missing');
    }

    const origin = event.headers?.origin || event.headers?.Origin;
    const body = parseBody(bodySchema, event.body);

    const startTs = new Date(body.start_ts);
    const endTs = new Date(body.end_ts);

    const blackout = await service.createBlackout({
      roomId: body.room_id,
      startTs,
      endTs,
      reason: body.reason || null,
      createdBy: user.userId,
    });

    return successResponse(201, { blackout }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

