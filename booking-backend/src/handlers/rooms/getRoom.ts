import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { successResponse } from '../../common/response';

const service = new RoomRepository();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const handler = createHandler(async ({ event, user }) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const params = parsePathParameters(pathSchema, event.pathParameters);

  const room = await service.findByIdOrThrow(params.id);

  return successResponse(200, { room }, origin);
});

