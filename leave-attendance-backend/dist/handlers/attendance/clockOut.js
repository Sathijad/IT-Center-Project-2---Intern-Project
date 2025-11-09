"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const attendanceService_1 = require("../../services/attendanceService");
const response_1 = require("../../common/response");
const service = new attendanceService_1.AttendanceService();
const bodySchema = zod_1.z.object({
    timestamp: zod_1.z.string().optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const payload = (0, validation_1.parseBody)(bodySchema, event.body ?? '{}');
    const log = await service.clockOut(user, {
        timestamp: payload.timestamp,
        idempotencyKey: event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'],
    });
    return (0, response_1.successResponse)(200, log, origin);
});
//# sourceMappingURL=clockOut.js.map