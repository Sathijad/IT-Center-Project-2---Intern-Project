import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { authenticateRequest, assertRole } from './auth';
import { successResponse, errorResponse } from './response';
import { toApplicationError } from './errors';
import { AuthenticatedUser, UserRole } from './types';
import { logger } from './logger';

interface HandlerOptions {
  requireAuth?: boolean;
  allowedRoles?: UserRole[] | UserRole;
}

interface HandlerContext {
  event: APIGatewayProxyEventV2;
  context: Context;
  user: AuthenticatedUser | null;
}

type HandlerResult<T> = Promise<APIGatewayProxyStructuredResultV2 | T>;

type HandlerFunction<T> = (input: HandlerContext) => HandlerResult<T>;

const getRequestOrigin = (event: APIGatewayProxyEventV2): string | undefined =>
  event.headers?.origin || event.headers?.Origin;

export const createHandler = <T>(
  handler: HandlerFunction<T>,
  options: HandlerOptions = { requireAuth: true },
) => {
  return async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    const origin = getRequestOrigin(event);
    let user: AuthenticatedUser | null = null;

    try {
      if (options.requireAuth !== false) {
        user = await authenticateRequest(event);
        if (options.allowedRoles) {
          assertRole(user, options.allowedRoles);
        }
      }

      const result = await handler({ event, context, user });

      if (result && typeof result === 'object' && 'statusCode' in result) {
        return result as APIGatewayProxyStructuredResultV2;
      }

      return successResponse(200, result, origin);
    } catch (error) {
      const appError = toApplicationError(error);
      logger.error('Handler failed', { requestId: context.awsRequestId, userId: user?.userId }, { error });

      return errorResponse(
        appError.statusCode,
        {
          code: appError.code,
          message: appError.message,
          details: appError.details,
          requestId: context.awsRequestId,
        },
        origin,
      );
    }
  };
};

