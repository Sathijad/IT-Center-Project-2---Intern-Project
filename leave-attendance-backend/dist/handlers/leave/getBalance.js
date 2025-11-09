"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const leaveService_1 = require("../../services/leaveService");
const response_1 = require("../../common/response");
const errors_1 = require("../../common/errors");
const service = new leaveService_1.LeaveService();
const querySchema = zod_1.z.object({
    user_id: zod_1.z.string().regex(/^\d+$/, 'user_id must be a number').optional(),
    year: zod_1.z
        .string()
        .regex(/^\d{4}$/, 'year must be YYYY format')
        .optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user, context }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const query = (0, validation_1.parseQuery)(querySchema, event.queryStringParameters);
    const targetUserId = query.user_id ? Number(query.user_id) : user.userId;
    if (query.user_id && !user.roles.includes('ADMIN')) {
        throw new errors_1.ForbiddenError('Only administrators can view balances for other users');
    }
    const year = query.year ? Number(query.year) : undefined;
    const balances = await service.getBalances(targetUserId, year);
    return (0, response_1.successResponse)(200, {
        userId: targetUserId,
        year: year ?? new Date().getUTCFullYear(),
        balances,
    }, origin);
});
//# sourceMappingURL=getBalance.js.map