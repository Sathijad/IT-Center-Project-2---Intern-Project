import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { BlackoutService } from '../../services/blackoutService';
import { successResponse } from '../../common/response';

const service = new BlackoutService();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const params = parsePathParameters(pathSchema, event.pathParameters);

    await service.deleteBlackout(params.id);

    return successResponse(200, { message: 'Blackout deleted' }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

