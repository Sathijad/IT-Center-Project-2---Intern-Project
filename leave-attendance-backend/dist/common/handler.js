"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandler = void 0;
const auth_1 = require("./auth");
const response_1 = require("./response");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const getRequestOrigin = (event) => event.headers?.origin || event.headers?.Origin;
const createHandler = (handler, options = { requireAuth: true }) => {
    return async (event, context) => {
        const origin = getRequestOrigin(event);
        let user = null;
        try {
            if (options.requireAuth !== false) {
                user = await (0, auth_1.authenticateRequest)(event);
                if (options.allowedRoles) {
                    (0, auth_1.assertRole)(user, options.allowedRoles);
                }
            }
            const result = await handler({ event, context, user });
            if (result && typeof result === 'object' && 'statusCode' in result) {
                return result;
            }
            return (0, response_1.successResponse)(200, result, origin);
        }
        catch (error) {
            const appError = (0, errors_1.toApplicationError)(error);
            logger_1.logger.error('Handler failed', { requestId: context.awsRequestId, userId: user?.userId }, { error });
            return (0, response_1.errorResponse)(appError.statusCode, {
                code: appError.code,
                message: appError.message,
                details: appError.details,
                requestId: context.awsRequestId,
            }, origin);
        }
    };
};
exports.createHandler = createHandler;
//# sourceMappingURL=handler.js.map