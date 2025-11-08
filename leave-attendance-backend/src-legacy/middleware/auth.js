import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { db } from '../config/database.js';

const COGNITO_ISSUER = process.env.COGNITO_ISSUER_URI || 
  'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y';

const client = jwksClient({
  jwksUri: `${COGNITO_ISSUER}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 3600000 // 1 hour
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.publicKey || key?.rsaPublicKey;
    callback(null, signingKey);
  });
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Missing or invalid authorization header',
        traceId: req.traceId
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        issuer: COGNITO_ISSUER,
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Get user ID from database
    const userId = await getUserIdFromCognitoSub(decoded.sub);
    
    // Get user roles from database
    const rolesResult = await db.query(`
      SELECT r.name 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN app_users u ON ur.user_id = u.id
      WHERE u.cognito_sub = $1 AND u.is_active = true
    `, [decoded.sub]);
    
    const userRoles = rolesResult.rows.map(row => row.name);

    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      cognitoSub: decoded.sub,
      userId: userId,
      roles: userRoles
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      code: 'UNAUTHENTICATED',
      message: 'Invalid or expired token',
      traceId: req.traceId
    });
  }
};

export const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          traceId: req.traceId
        });
      }

      // Get user roles from database
      const result = await db.query(`
        SELECT r.name 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN app_users u ON ur.user_id = u.id
        WHERE u.cognito_sub = $1 AND u.is_active = true
      `, [req.user.cognitoSub]);

      const userRoles = result.rows.map(row => row.name);
      const hasRole = allowedRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          traceId: req.traceId
        });
      }

      req.user.roles = userRoles;
      req.user.userId = await getUserIdFromCognitoSub(req.user.cognitoSub);
      next();
    } catch (error) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Error checking authorization',
        traceId: req.traceId
      });
    }
  };
};

async function getUserIdFromCognitoSub(cognitoSub) {
  const result = await db.query(
    'SELECT id FROM app_users WHERE cognito_sub = $1',
    [cognitoSub]
  );
  return result.rows[0]?.id;
}

