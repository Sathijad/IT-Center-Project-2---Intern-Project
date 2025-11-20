import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseBody } from '../../common/validation';
import { RoomRepository } from '../../repositories/roomRepository';
import { successResponse } from '../../common/response';

const service = new RoomRepository();

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  capacity: z.number().int().positive('Capacity must be positive'),
  amenities: z.array(z.string()).optional(),
  location: z.string().max(255).optional().nullable(),
  active: z.boolean().optional(),
  owner_team_id: z.number().int().positive().optional().nullable(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const body = parseBody(bodySchema, event.body);

    const room = await service.create({
      name: body.name,
      capacity: body.capacity,
      amenities: body.amenities || [],
      location: body.location || null,
      active: body.active ?? true,
      ownerTeamId: body.owner_team_id || null,
    });

    return successResponse(201, { room }, origin);
  },
  { allowedRoles: 'ADMIN' },
);

