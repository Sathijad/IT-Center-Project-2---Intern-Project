"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const leaveService_1 = require("../../services/leaveService");
const response_1 = require("../../common/response");
const service = new leaveService_1.LeaveService();
const pathSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'id must be a number'),
});
const bodySchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT', 'CANCEL']),
    notes: zod_1.z.string().max(500).optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const params = (0, validation_1.parsePathParameters)(pathSchema, event.pathParameters);
    const payload = (0, validation_1.parseBody)(bodySchema, event.body);
    const requestId = Number(params.id);
    const updated = await service.updateRequest(user, {
        requestId,
        action: payload.action,
        notes: payload.notes,
    });
    return (0, response_1.successResponse)(200, updated, origin);
});
//# sourceMappingURL=updateRequest.js.map