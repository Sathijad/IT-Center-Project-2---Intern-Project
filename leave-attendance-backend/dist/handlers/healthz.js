"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler_1 = require("../common/handler");
const response_1 = require("../common/response");
exports.handler = (0, handler_1.createHandler)(async () => (0, response_1.successResponse)(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
}), { requireAuth: false });
//# sourceMappingURL=healthz.js.map