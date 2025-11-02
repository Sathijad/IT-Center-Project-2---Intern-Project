import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserFromDatabase } from '../lib/cognito';
import { UnauthorizedError, sendErrorResponse } from '../lib/errors';
import { UserContext } from '../types';
import { AuthenticatedRequest } from '../types';

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = await verifyToken(token);
    
    if (!decoded.sub) {
      throw new UnauthorizedError('Invalid token: missing sub claim');
    }

    // Get user from database
    const dbUser = await getUserFromDatabase(decoded.sub);
    
    if (!dbUser) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Build user context
    const userContext: UserContext = {
      userId: dbUser.id,
      cognitoSub: dbUser.cognito_sub,
      email: dbUser.email,
      roles: dbUser.roles,
      isAdmin: dbUser.roles.includes('ADMIN'),
    };

    // Attach to request
    req.user = userContext;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      sendErrorResponse(res, error);
    } else {
      console.error('Auth middleware error:', error);
      sendErrorResponse(res, new UnauthorizedError('Authentication failed'));
    }
  }
}

