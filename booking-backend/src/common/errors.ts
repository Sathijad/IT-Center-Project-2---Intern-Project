export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Not Found', details?: Record<string, unknown>) {
    super('NOT_FOUND', message, 404, details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export const toApplicationError = (error: unknown): ApplicationError => {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApplicationError('INTERNAL_SERVER_ERROR', error.message || 'Internal server error', 500);
  }

  return new ApplicationError('INTERNAL_SERVER_ERROR', 'Internal server error', 500);
};

