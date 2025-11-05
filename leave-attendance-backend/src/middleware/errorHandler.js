import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })),
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Resource already exists',
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      code: 'INVALID_REFERENCE',
      message: 'Invalid reference to related resource',
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    code: err.code || 'INTERNAL_ERROR',
    message,
    traceId: req.traceId,
    timestamp: new Date().toISOString()
  });
};

