import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { MsGraphService } from '../../services/msGraphService';
import { successResponse } from '../../common/response';

const service = new MsGraphService();

const bodySchema = z.object({
  request_id: z.coerce.number().int().positive(),
});

export const handler = createHandler(
  async ({ event }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const payload = parseBody(bodySchema, event.body);

    await service.enqueueCalendarSync(payload.request_id);

    return successResponse(
      202,
      {
        message: 'Calendar sync enqueued',
        requestId: payload.request_id,
      },
      origin,
    );
  },
  { allowedRoles: ['ADMIN'] },
);

