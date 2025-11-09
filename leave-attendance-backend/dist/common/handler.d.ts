import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { AuthenticatedUser, UserRole } from './types';
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
export declare const createHandler: <T>(handler: HandlerFunction<T>, options?: HandlerOptions) => (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyStructuredResultV2>;
export {};
