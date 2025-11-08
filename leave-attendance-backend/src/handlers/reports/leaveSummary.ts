import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { ReportService } from '../../services/reportService';
import { successResponse } from '../../common/response';

const service = new ReportService();

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  team_id: z.string().regex(/^\d+$/).optional(),
});

export const handler = createHandler(
  async ({ event, user }) => {
    if (!user) {
      throw new Error('User context missing');
    }

    const origin = event.headers?.origin || event.headers?.Origin;
    const query = parseQuery(querySchema, event.queryStringParameters);

    const summary = await service.getLeaveSummary(user, {
      from: query.from,
      to: query.to,
      teamId: query.team_id ? Number(query.team_id) : undefined,
    });

    return successResponse(200, summary, origin);
  },
  { allowedRoles: ['ADMIN'] },
);

