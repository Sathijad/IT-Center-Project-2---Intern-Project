"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const attendanceService_1 = require("../../services/attendanceService");
const errors_1 = require("../../common/errors");
const response_1 = require("../../common/response");
const service = new attendanceService_1.AttendanceService();
const querySchema = zod_1.z.object({
    user_id: zod_1.z.string().regex(/^\d+$/).optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    page: zod_1.z.string().regex(/^\d+$/).optional(),
    size: zod_1.z.string().regex(/^\d+$/).optional(),
    sort: zod_1.z.string().optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const query = (0, validation_1.parseQuery)(querySchema, event.queryStringParameters);
    if (query.user_id && !user.roles.includes('ADMIN') && Number(query.user_id) !== user.userId) {
        throw new errors_1.ForbiddenError('Only administrators can view attendance logs for other users');
    }
    const filters = {
        userId: query.user_id ? Number(query.user_id) : undefined,
        from: query.from,
        to: query.to,
        page: query.page ? Number(query.page) : undefined,
        size: query.size ? Number(query.size) : undefined,
        sort: query.sort,
    };
    const result = await service.listLogs(user, filters);
    return (0, response_1.successResponse)(200, {
        items: result.items,
        page: result.page,
        size: result.size,
        total: result.total,
    }, origin);
});
//# sourceMappingURL=getLogs.js.map