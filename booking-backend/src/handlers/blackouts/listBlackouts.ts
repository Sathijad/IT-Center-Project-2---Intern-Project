import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { BlackoutService } from '../../services/blackoutService';
import { successResponse } from '../../common/response';

const service = new BlackoutService();

const querySchema = z.object({
  room_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const query = parseQuery(querySchema, event.queryStringParameters);

    const blackouts = await service.listBlackouts(query.room_id);

    return successResponse(200, { blackouts }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

