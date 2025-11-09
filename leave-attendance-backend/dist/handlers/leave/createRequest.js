"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const leaveService_1 = require("../../services/leaveService");
const response_1 = require("../../common/response");
const service = new leaveService_1.LeaveService();
const bodySchema = zod_1.z.object({
    policy_id: zod_1.z.coerce.number().int().positive(),
    start_date: zod_1.z.string().min(10),
    end_date: zod_1.z.string().min(10),
    half_day: zod_1.z.coerce.boolean().optional(),
    reason: zod_1.z.string().max(500).optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const payload = (0, validation_1.parseBody)(bodySchema, event.body);
    const request = await service.createRequest(user, {
        policyId: payload.policy_id,
        startDate: payload.start_date,
        endDate: payload.end_date,
        halfDay: payload.half_day,
        reason: payload.reason,
        idempotencyKey: event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'],
    });
    return (0, response_1.successResponse)(201, request, origin);
});
//# sourceMappingURL=createRequest.js.map