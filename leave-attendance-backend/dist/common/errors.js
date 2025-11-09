"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toApplicationError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ApplicationError = void 0;
class ApplicationError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, statusCode = 400, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ApplicationError = ApplicationError;
class UnauthorizedError extends ApplicationError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApplicationError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends ApplicationError {
    constructor(message = 'Not Found', details) {
        super('NOT_FOUND', message, 404, details);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends ApplicationError {
    constructor(message = 'Validation failed', details) {
        super('VALIDATION_ERROR', message, 422, details);
    }
}
exports.ValidationError = ValidationError;
const toApplicationError = (error) => {
    if (error instanceof ApplicationError) {
        return error;
    }
    if (error instanceof Error) {
        return new ApplicationError('INTERNAL_SERVER_ERROR', error.message || 'Internal server error', 500);
    }
    return new ApplicationError('INTERNAL_SERVER_ERROR', 'Internal server error', 500);
};
exports.toApplicationError = toApplicationError;
//# sourceMappingURL=errors.js.map