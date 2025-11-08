import { createHandler } from '../common/handler';
import { successResponse } from '../common/response';

export const handler = createHandler(
  async () =>
    successResponse(200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  { requireAuth: false },
);

