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

    // Convert to Date objects and validate
    const startTs = new Date(body.start_ts);
    const endTs = new Date(body.end_ts);

    // Validate Date objects are valid
    if (isNaN(startTs.getTime())) {
      throw new Error(`Invalid start_ts: ${body.start_ts}`);
    }
    if (isNaN(endTs.getTime())) {
      throw new Error(`Invalid end_ts: ${body.end_ts}`);
    }

    // Ensure userId is a valid number (convert if string)
    const userId = typeof user.userId === 'number' ? user.userId : Number(user.userId);
    if (isNaN(userId) || !Number.isFinite(userId) || userId <= 0) {
      throw new Error(`Invalid userId: ${user.userId}`);
    }

    const blackout = await service.createBlackout({
      roomId: body.room_id,
      startTs,
      endTs,
      reason: body.reason || null,
      createdBy: userId,
    });

    return successResponse(201, { blackout }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

