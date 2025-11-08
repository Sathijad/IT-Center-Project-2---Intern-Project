import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { LeaveService } from '../../services/leaveService';
import { successResponse } from '../../common/response';
import { ForbiddenError } from '../../common/errors';

const service = new LeaveService();

const querySchema = z.object({
  user_id: z.string().regex(/^\d+$/, 'user_id must be a number').optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, 'year must be YYYY format')
    .optional(),
});

export const handler = createHandler(async ({ event, user, context }) => {
  if (!user) {
    throw new Error('User context missing');
  }

  const origin = event.headers?.origin || event.headers?.Origin;
  const query = parseQuery(querySchema, event.queryStringParameters);

  const targetUserId = query.user_id ? Number(query.user_id) : user.userId;

  if (query.user_id && !user.roles.includes('ADMIN')) {
    throw new ForbiddenError('Only administrators can view balances for other users');
  }

  const year = query.year ? Number(query.year) : undefined;
  const balances = await service.getBalances(targetUserId, year);

  return successResponse(
    200,
    {
      userId: targetUserId,
      year: year ?? new Date().getUTCFullYear(),
      balances,
    },
    origin,
  );
});

