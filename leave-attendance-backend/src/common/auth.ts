import { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { AuthenticatedUser, UserRole } from './types';
import { ForbiddenError, UnauthorizedError } from './errors';
import { logger } from './logger';

interface CognitoJwtPayload extends JwtPayload {
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

let jwks: JwksClient | null = null;

const getIssuer = (): string => {
  const region = process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!region || !userPoolId) {
    throw new Error('Cognito configuration is missing (COGNITO_REGION or COGNITO_USER_POOL_ID)');
  }

  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
};

const getJwksClient = (): JwksClient => {
  if (!jwks) {
    const issuer = getIssuer();
    jwks = jwksClient({
      jwksUri: `${issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: Number(process.env.JWKS_CACHE_MS || 3_600_000),
      timeout: Number(process.env.JWKS_TIMEOUT_MS || 5000),
    });
  }

  return jwks;
};

const getSigningKey = (header: JwtHeader, callback: SigningKeyCallback) => {
  const client = getJwksClient();
  if (!header.kid) {
    callback(new Error('Token header missing kid'));
    return;
  }

  client.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

const verifyJwt = (token: string): Promise<CognitoJwtPayload> => {
  const issuer = getIssuer();
  const audience = process.env.COGNITO_CLIENT_ID;

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience,
        issuer,
      },
      (error, decoded) => {
        if (error) {
          reject(new UnauthorizedError('Invalid or expired token'));
          return;
        }

        if (!decoded || typeof decoded === 'string') {
          reject(new UnauthorizedError('Invalid token payload'));
          return;
        }

        const payload = decoded as CognitoJwtPayload;

        if (!payload.sub) {
          reject(new UnauthorizedError('Token missing subject'));
          return;
        }

        resolve(payload);
      },
    );
  });
};

const extractAuthorizationHeader = (event: APIGatewayProxyEventV2): string => {
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header) {
    throw new UnauthorizedError('Missing Authorization header');
  }
  return header;
};

const extractBearerToken = (authHeader: string): string => {
  const [scheme, token] = authHeader.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    throw new UnauthorizedError('Authorization header must be Bearer token');
  }
  return token;
};

export const authenticateRequest = async (event: APIGatewayProxyEventV2): Promise<AuthenticatedUser> => {
  const authHeader = extractAuthorizationHeader(event);
  const token = extractBearerToken(authHeader);

  const payload = await verifyJwt(token);
  logger.debug('JWT verified', { sub: payload.sub });

  const userIdCandidate =
    payload['custom:user_id'] ?? payload['user_id'] ?? payload['custom:employee_id'] ?? payload['employee_id'];
  const userId =
    typeof userIdCandidate === 'string' ? Number(userIdCandidate) : Number(userIdCandidate ?? Number.NaN);

  if (!Number.isFinite(userId)) {
    throw new UnauthorizedError('Token missing numeric user_id claim');
  }

  const emailClaim =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload['custom:email'] === 'string'
      ? payload['custom:email']
      : typeof payload['preferred_username'] === 'string'
      ? payload['preferred_username']
      : typeof payload['cognito:username'] === 'string'
      ? payload['cognito:username']
      : null;

  if (!emailClaim) {
    throw new UnauthorizedError('Token missing email claim');
  }

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
    emailClaim;

  const teamClaim = payload['custom:team_id'] ?? payload['team_id'];
  const teamNumeric =
    typeof teamClaim === 'string' ? Number(teamClaim) : typeof teamClaim === 'number' ? teamClaim : Number.NaN;
  const teamId = Number.isFinite(teamNumeric) ? Number(teamNumeric) : null;

  const user: AuthenticatedUser = {
    userId,
    email: emailClaim,
    displayName,
    teamId,
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

