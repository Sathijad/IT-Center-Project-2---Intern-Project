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
    latitude: zod_1.z.coerce.number().optional(),
    longitude: zod_1.z.coerce.number().optional(),
    source: zod_1.z.string().max(50).optional(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event, user }) => {
    if (!user) {
        throw new Error('User context missing');
    }
    const origin = event.headers?.origin || event.headers?.Origin;
    const payload = (0, validation_1.parseBody)(bodySchema, event.body ?? '{}');
    const log = await service.clockIn(user, {
        timestamp: payload.timestamp,
        latitude: payload.latitude,
        longitude: payload.longitude,
        source: payload.source,
        idempotencyKey: event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'],
    });
    return (0, response_1.successResponse)(201, log, origin);
});
//# sourceMappingURL=clockIn.js.map