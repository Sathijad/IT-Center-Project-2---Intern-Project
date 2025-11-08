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

  if (query.user_id && !user.roles.includes('ADMIN') && Number(query.user_id) !== user.userId) {
    throw new ForbiddenError('Only administrators can view leave requests for other users');
  }

  const filters = {
    userId: query.user_id ? Number(query.user_id) : undefined,
    status: query.status,
    startDate: query.from,
    endDate: query.to,
    page: query.page ? Number(query.page) : undefined,
    size: query.size ? Number(query.size) : undefined,
    sort: query.sort,
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

