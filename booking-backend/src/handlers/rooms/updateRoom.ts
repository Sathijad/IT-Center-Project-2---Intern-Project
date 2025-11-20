import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parsePathParameters, parseBody } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { successResponse } from '../../common/response';

const service = new RoomRepository();

const pathSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const bodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  capacity: z.number().int().positive().optional(),
  amenities: z.array(z.string()).optional(),
  location: z.string().max(255).optional().nullable(),
  active: z.boolean().optional(),
  owner_team_id: z.number().int().positive().optional().nullable(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const params = parsePathParameters(pathSchema, event.pathParameters);
    const body = parseBody(bodySchema, event.body);

    const room = await service.update(params.id, {
      name: body.name,
      capacity: body.capacity,
      amenities: body.amenities,
      location: body.location,
      active: body.active,
      ownerTeamId: body.owner_team_id,
    });

    return successResponse(200, { room }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

