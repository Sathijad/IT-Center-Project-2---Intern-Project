"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
const baseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Idempotency-Key,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};
const resolveOrigin = (requestOrigin) => {
    if (!requestOrigin) {
        return allowedOrigins[0] || '*';
    }
    if (allowedOrigins.length === 0) {
        return requestOrigin;
    }
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
};
const successResponse = (statusCode, payload, requestOrigin, extraHeaders) => ({
    statusCode,
    headers: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': resolveOrigin(requestOrigin),
        ...extraHeaders,
    },
    body: JSON.stringify(payload),
});
exports.successResponse = successResponse;
const errorResponse = (statusCode, error, requestOrigin, extraHeaders) => ({
    statusCode,
    headers: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': resolveOrigin(requestOrigin),
        ...extraHeaders,
    },
    body: JSON.stringify(error),
});
exports.errorResponse = errorResponse;
//# sourceMappingURL=response.js.map