import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AuthenticatedUser, UserRole } from './types';
import { ForbiddenError, UnauthorizedError } from './errors';
import { logger } from './logger';
import { UserRepository } from '../repositories/userRepository';

interface CognitoJwtPayload {
  sub: string;
  email?: string;
  'cognito:groups'?: string[];
  'custom:user_id'?: string | number;
  user_id?: string | number;
  'employee_id'?: string | number;
  'custom:employee_id'?: string | number;
  'custom:roles'?: string[] | string;
  roles?: string[] | string;
  'custom:team_id'?: string | number;
  team_id?: string | number;
  'custom:display_name'?: string;
  name?: string;
  preferred_username?: string;
  'custom:email'?: string;
  'cognito:username'?: string;
}

type JwtAuthorizerContext = {
  jwt?: {
    claims: Record<string, unknown>;
    scopes?: string[];
  };
};

type RequestContextWithAuthorizer = APIGatewayProxyEventV2['requestContext'] & {
  authorizer?: JwtAuthorizerContext;
};

const userRepository = new UserRepository();

const parseMaybeJsonArray = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      // fall through to comma split
    }
  }
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [trimmed];
};

const coerceClaimValue = (key: string, value: unknown): unknown => {
  if (typeof value === 'string') {
    switch (key) {
      case 'cognito:groups':
      case 'custom:roles':
      case 'roles':
        return parseMaybeJsonArray(value);
      default:
        return value;
    }
  }
  return value;
};

const getClaims = (event: APIGatewayProxyEventV2): CognitoJwtPayload => {
  const requestContext = event.requestContext as RequestContextWithAuthorizer;
  const claims = requestContext.authorizer?.jwt?.claims;
  if (!claims) {
    throw new UnauthorizedError('Missing JWT claims from authorizer');
  }

  const normalizedClaims = Object.entries(claims).reduce<Partial<CognitoJwtPayload> & Record<string, unknown>>(
    (acc, [key, value]) => {
    acc[key] = coerceClaimValue(key, value);
    return acc;
  },
    {},
  );

  if (!normalizedClaims.sub || typeof normalizedClaims.sub !== 'string') {
    throw new UnauthorizedError('Token missing subject');
  }

  return normalizedClaims as CognitoJwtPayload;
};

export const authenticateRequest = async (event: APIGatewayProxyEventV2): Promise<AuthenticatedUser> => {
  const payload = getClaims(event);
  logger.debug('JWT claims received', { sub: payload.sub });

  const emailClaim =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload['custom:email'] === 'string'
      ? payload['custom:email']
      : null;

  const roleCandidates: string[] = [];
  const appendRoles = (value: unknown) => {
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      value
        .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
        .forEach((role) => roleCandidates.push(role.trim()));
      return;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      roleCandidates.push(value.trim());
    }
  };

  appendRoles(payload['cognito:groups']);
  appendRoles(payload['custom:roles']);
  appendRoles(payload['roles']);

  const normalizedRoles = Array.from(
    new Set(
      roleCandidates.map((role) => role.toUpperCase()).map((role) => (role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE')),
    ),
  ) as UserRole[];

  if (normalizedRoles.length === 0) {
    normalizedRoles.push('EMPLOYEE');
  }

  const displayName =
    (typeof payload['custom:display_name'] === 'string' && payload['custom:display_name']) ||
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload['preferred_username'] === 'string' && payload['preferred_username']) ||
    (typeof payload['cognito:username'] === 'string' && payload['cognito:username']) ||
    emailClaim ||
    payload.sub;

  const teamClaim = payload['custom:team_id'] ?? payload['team_id'];
  const teamNumeric =
    typeof teamClaim === 'string' ? Number(teamClaim) : typeof teamClaim === 'number' ? teamClaim : Number.NaN;
  const teamIdFromClaims = Number.isFinite(teamNumeric) ? Number(teamNumeric) : null;

  const userRecord = await userRepository.upsertFromClaims({
    cognitoSub: payload.sub,
    email: emailClaim,
    displayName,
    teamId: teamIdFromClaims ?? undefined,
  });

  const resolvedTeamId = userRecord.teamId ?? teamIdFromClaims ?? null;
  const resolvedEmail = userRecord.email ?? emailClaim ?? undefined;
  const resolvedDisplayName = userRecord.displayName ?? displayName ?? resolvedEmail;

  const user: AuthenticatedUser = {
    userId: userRecord.userId,
    email: resolvedEmail ?? payload.sub,
    displayName: resolvedDisplayName,
    teamId: resolvedTeamId,
    roles: normalizedRoles,
    sub: payload.sub,
  };

  logger.debug('User roles resolved', { userId: user.userId, roles: user.roles });

  return user;
};

export const assertRole = (user: AuthenticatedUser, allowedRoles: UserRole[] | UserRole): void => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const hasRole = roles.some((role) => user.roles.includes(role));
  if (!hasRole) {
    throw new ForbiddenError('User does not have sufficient privileges');
  }
};

