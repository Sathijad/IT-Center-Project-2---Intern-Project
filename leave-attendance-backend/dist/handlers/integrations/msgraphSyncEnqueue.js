"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const handler_1 = require("../../common/handler");
const validation_1 = require("../../common/validation");
const msGraphService_1 = require("../../services/msGraphService");
const response_1 = require("../../common/response");
const service = new msGraphService_1.MsGraphService();
const bodySchema = zod_1.z.object({
    request_id: zod_1.z.coerce.number().int().positive(),
});
exports.handler = (0, handler_1.createHandler)(async ({ event }) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const payload = (0, validation_1.parseBody)(bodySchema, event.body);
    await service.enqueueCalendarSync(payload.request_id);
    return (0, response_1.successResponse)(202, {
        message: 'Calendar sync enqueued',
        requestId: payload.request_id,
    }, origin);
}, { allowedRoles: ['ADMIN'] });
//# sourceMappingURL=msgraphSyncEnqueue.js.map