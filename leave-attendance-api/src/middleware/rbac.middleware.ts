import { Response, NextFunction } from 'express';
import { ForbiddenError, sendErrorResponse } from '../lib/errors';
import { AuthenticatedRequest, UserContext } from '../types';

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendErrorResponse(res, new ForbiddenError('User not authenticated'));
      return;
    }

    const userRoles = req.user.roles;
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      sendErrorResponse(
        res,
        new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`)
      );
      return;
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.isAdmin) {
    sendErrorResponse(res, new ForbiddenError('Admin access required'));
    return;
  }
  next();
}

// Middleware to enforce that EMPLOYEE can only access their own data
export function enforceOwnData(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendErrorResponse(res, new ForbiddenError('User not authenticated'));
    return;
  }

  // Admin can access any user's data
  if (req.user.isAdmin) {
    next();
    return;
  }

  // For EMPLOYEE, check if user_id param matches their own ID
  const requestedUserId = req.query.user_id 
    ? parseInt(req.query.user_id as string, 10)
    : req.body.user_id 
    ? parseInt(req.body.user_id as string, 10)
    : null;

  // If no user_id specified, default to own data
  if (!requestedUserId) {
    // Will be handled by controller to use req.user.userId
    next();
    return;
  }

  // EMPLOYEE can only access their own data
  if (requestedUserId !== req.user.userId) {
    sendErrorResponse(res, new ForbiddenError('Access denied: can only view own data'));
    return;
  }

  next();
}

