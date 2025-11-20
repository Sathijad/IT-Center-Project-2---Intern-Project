export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string | number;
  userId?: string | number;
  correlationId?: string | number;
  [key: string]: unknown;
}

const formatMessage = (level: LogLevel, message: string, context?: LogContext, meta?: unknown) => {
  const base = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (meta !== undefined) {
    return JSON.stringify({ ...base, meta });
  }

  return JSON.stringify(base);
};

export const logger = {
  debug(message: string, context?: LogContext, meta?: unknown) {
    console.debug(formatMessage('debug', message, context, meta));
  },

  info(message: string, context?: LogContext, meta?: unknown) {
    console.info(formatMessage('info', message, context, meta));
  },

  warn(message: string, context?: LogContext, meta?: unknown) {
    console.warn(formatMessage('warn', message, context, meta));
  },

  error(message: string, context?: LogContext, meta?: unknown) {
    console.error(formatMessage('error', message, context, meta));
  },
};

