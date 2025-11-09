import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AuthenticatedUser, UserRole } from './types';
export declare const authenticateRequest: (event: APIGatewayProxyEventV2) => Promise<AuthenticatedUser>;
export declare const assertRole: (user: AuthenticatedUser, allowedRoles: UserRole[] | UserRole) => void;
