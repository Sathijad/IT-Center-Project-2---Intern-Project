import { Response, NextFunction, Request } from 'express';
import { ForbiddenError, sendErrorResponse } from '../lib/errors';
import { AuthenticatedRequest } from '../types';

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

  // For EMPLOYEE, ignore any user_id param and let controller use req.user.userId
  // This prevents 403 errors when frontend accidentally passes user_id
  // The controller will override it with req.user.userId anyway
  const expressReq = req as Request;
  if (expressReq.query?.user_id) {
    // Remove user_id from query for non-admins to prevent confusion
    // Controller will use req.user.userId instead
    delete expressReq.query.user_id;
  }
  if (expressReq.body?.user_id) {
    // Remove user_id from body for non-admins
    delete expressReq.body.user_id;
  }

  // Allow through - controller will enforce using req.user.userId
  next();
}

