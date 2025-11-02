import { Request, Response, NextFunction } from 'express';
import { ApiError, sendErrorResponse } from '../lib/errors';

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  sendErrorResponse(res, err);
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
}

