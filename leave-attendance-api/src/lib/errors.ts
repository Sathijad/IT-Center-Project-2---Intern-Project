import { Response } from 'express';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

// Error codes for Phase 2
export const ERROR_CODES = {
  LEAVE_OVERLAP: 'LEAVE_OVERLAP',
  POLICY_LIMIT_EXCEEDED: 'POLICY_LIMIT_EXCEEDED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  GEO_OUT_OF_RANGE: 'GEO_OUT_OF_RANGE',
  ALREADY_CLOCKED_IN: 'ALREADY_CLOCKED_IN',
  CLOCK_OUT_MISSING_IN: 'CLOCK_OUT_MISSING_IN',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  MIN_NOTICE_PERIOD_NOT_MET: 'MIN_NOTICE_PERIOD_NOT_MET',
} as const;

export function sendErrorResponse(res: Response, error: ApiError | Error): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.error('Unexpected error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    });
  }
}

