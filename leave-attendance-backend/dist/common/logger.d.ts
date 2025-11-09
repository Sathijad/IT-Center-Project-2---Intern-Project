export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogContext {
    requestId?: string | number;
    userId?: string | number;
    correlationId?: string | number;
    [key: string]: unknown;
}
export declare const logger: {
    debug(message: string, context?: LogContext, meta?: unknown): void;
    info(message: string, context?: LogContext, meta?: unknown): void;
    warn(message: string, context?: LogContext, meta?: unknown): void;
    error(message: string, context?: LogContext, meta?: unknown): void;
};
