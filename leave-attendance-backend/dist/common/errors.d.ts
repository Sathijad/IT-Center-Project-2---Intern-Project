export declare class ApplicationError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, statusCode?: number, details?: Record<string, unknown>);
}
export declare class UnauthorizedError extends ApplicationError {
    constructor(message?: string);
}
export declare class ForbiddenError extends ApplicationError {
    constructor(message?: string);
}
export declare class NotFoundError extends ApplicationError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class ValidationError extends ApplicationError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare const toApplicationError: (error: unknown) => ApplicationError;
