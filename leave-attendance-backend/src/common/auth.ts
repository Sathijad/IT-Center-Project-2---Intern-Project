import { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { query } from './db';
import { AuthenticatedUser, UserRole } from './types';
import { ForbiddenError, UnauthorizedError } from './errors';
import { logger } from './logger';

interface CognitoJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  'cognito:groups'?: string[];
}

interface UserRow {
  id: number;
  email: string;
  display_name: string | null;
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

const fetchUserFromDatabase = async (sub: string): Promise<AuthenticatedUser> => {
  const userResult = await query<UserRow>(
    `SELECT id, email, display_name
     FROM app_users
     WHERE cognito_sub = $1`,
    [sub],
  );

  if (userResult.rowCount === 0) {
    throw new UnauthorizedError('User not found');
  }

  const userRow = userResult.rows[0];

  const roleResult = await query<{ name: string }>(
    `SELECT r.name
     FROM user_roles ur
     INNER JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userRow.id],
  );

  const roles = roleResult.rows.map((row) => row.name.toUpperCase() as UserRole);

  return {
    userId: userRow.id,
    email: userRow.email,
    displayName: userRow.display_name,
    roles: roles.length ? roles : ['EMPLOYEE'],
    sub,
  };
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

  const user = await fetchUserFromDatabase(payload.sub);
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

