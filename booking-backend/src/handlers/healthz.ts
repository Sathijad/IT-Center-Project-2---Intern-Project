import { createHandler } from '../common/handler';
import { successResponse } from '../common/response';

export const handler = createHandler(
  async ({ event }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    return successResponse(
      200,
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'booking-api',
      },
      origin,
    );
  },
  { requireAuth: false },
);

