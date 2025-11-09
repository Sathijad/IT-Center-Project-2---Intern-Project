"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const reportService_1 = require("../../services/reportService");
const response_1 = require("../../common/response");
const service = new reportService_1.ReportService();
const querySchema = zod_1.z.object({
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    team_id: zod_1.z.string().regex(/^\d+$/).optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const query = (0, validation_1.parseQuery)(querySchema, event.queryStringParameters);
    const summary = await service.getLeaveSummary(user, {
        from: query.from,
        to: query.to,
        teamId: query.team_id ? Number(query.team_id) : undefined,
    });
    return (0, response_1.successResponse)(200, summary, origin);
}, { allowedRoles: ['ADMIN'] });
//# sourceMappingURL=leaveSummary.js.map