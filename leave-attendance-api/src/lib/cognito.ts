import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { queryOne } from './db';

const issuer = process.env.COGNITO_ISSUER || '';
const jwkSetUri = process.env.COGNITO_JWK_SET_URI || '';

const client = jwksClient({
  jwksUri: jwkSetUri,
  cache: true,
  cacheMaxAge: parseInt(process.env.JWKS_CACHE_TTL || '600', 10) * 1000,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('No key ID in token header'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export interface CognitoTokenPayload extends JwtPayload {
  sub: string; // cognito sub
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  email?: string;
  'custom:user_id'?: string; // If we add this custom attribute
}

export async function verifyToken(token: string): Promise<CognitoTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer,
        algorithms: ['RS256'],
        clockTolerance: parseInt(process.env.CLOCK_SKEW_SECONDS || '120', 10),
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(decoded as CognitoTokenPayload);
      }
    );
  });
}

// Get user from database by cognito_sub and return user_id + roles
export interface DbUser {
  id: number;
  cognito_sub: string;
  email: string;
  roles: string[];
}

export async function getUserFromDatabase(cognitoSub: string): Promise<DbUser | null> {
  const user = await queryOne<{
    id: number;
    cognito_sub: string;
    email: string;
    roles: string[];
  }>(
    `
    SELECT 
      u.id,
      u.cognito_sub,
      u.email,
      COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
    FROM app_users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.cognito_sub = $1 AND u.is_active = true
    GROUP BY u.id, u.cognito_sub, u.email
    `,
    [cognitoSub]
  );

  return user;
}

