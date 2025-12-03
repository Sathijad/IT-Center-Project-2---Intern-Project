import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { LeaveService } from '../../services/leaveService';
import { ForbiddenError } from '../../common/errors';
import { successResponse } from '../../common/response';

const service = new LeaveService();

const querySchema = z.object({
  user_id: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  size: z.string().regex(/^\d+$/).optional(),
  sort: z.string().optional(),
});

export const handler = createHandler(async ({ event, user }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const query = parseQuery(querySchema, event.queryStringParameters);

  const isAdmin = user.roles.includes('ADMIN');
  
  if (query.user_id && !isAdmin && Number(query.user_id) !== user.userId) {
    throw new ForbiddenError('Only administrators can view leave requests for other users');
  }

  // For admins: show all requests when no user_id is provided
  // For non-admins: always filter by their own user_id
  // When user_id is explicitly provided, use it (admins viewing specific user)
  const numericUserId = typeof user.userId === 'number' ? user.userId : Number(user.userId);
  const targetUserId = isAdmin
    ? (query.user_id ? Number(query.user_id) : undefined)  // Admins: undefined means show all
    : numericUserId;  // Non-admins: always their own id

  const filters = {
    ...(targetUserId !== undefined ? { userId: targetUserId } : {}),  // Only set userId if provided
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { startDate: query.from } : {}),
    ...(query.to ? { endDate: query.to } : {}),
    ...(query.page ? { page: Number(query.page) } : {}),
    ...(query.size ? { size: Number(query.size) } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
  };

  const result = await service.listRequests(user, filters);

  return successResponse(
    200,
    {
      items: result.items,
      page: result.page,
      size: result.size,
      total: result.total,
    },
    origin,
  );
});

