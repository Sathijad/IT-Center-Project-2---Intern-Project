"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRole = exports.authenticateRequest = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const db_1 = require("./db");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
let jwks = null;
const getIssuer = () => {
    const region = process.env.COGNITO_REGION;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!region || !userPoolId) {
        throw new Error('Cognito configuration is missing (COGNITO_REGION or COGNITO_USER_POOL_ID)');
    }
    return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
};
const getJwksClient = () => {
    if (!jwks) {
        const issuer = getIssuer();
        jwks = (0, jwks_rsa_1.default)({
            jwksUri: `${issuer}/.well-known/jwks.json`,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: Number(process.env.JWKS_CACHE_MS || 3_600_000),
            timeout: Number(process.env.JWKS_TIMEOUT_MS || 5000),
        });
    }
    return jwks;
};
const getSigningKey = (header, callback) => {
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
const verifyJwt = (token) => {
    const issuer = getIssuer();
    const audience = process.env.COGNITO_CLIENT_ID;
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, getSigningKey, {
            audience,
            issuer,
        }, (error, decoded) => {
            if (error) {
                reject(new errors_1.UnauthorizedError('Invalid or expired token'));
                return;
            }
            if (!decoded || typeof decoded === 'string') {
                reject(new errors_1.UnauthorizedError('Invalid token payload'));
                return;
            }
            const payload = decoded;
            if (!payload.sub) {
                reject(new errors_1.UnauthorizedError('Token missing subject'));
                return;
            }
            resolve(payload);
        });
    });
};
const fetchUserFromDatabase = async (sub) => {
    const userResult = await (0, db_1.query)(`SELECT id, email, display_name
     FROM app_users
     WHERE cognito_sub = $1`, [sub]);
    if (userResult.rowCount === 0) {
        throw new errors_1.UnauthorizedError('User not found');
    }
    const userRow = userResult.rows[0];
    const roleResult = await (0, db_1.query)(`SELECT r.name
     FROM user_roles ur
     INNER JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1`, [userRow.id]);
    const roles = roleResult.rows.map((row) => row.name.toUpperCase());
    return {
        userId: userRow.id,
        email: userRow.email,
        displayName: userRow.display_name,
        roles: roles.length ? roles : ['EMPLOYEE'],
        sub,
    };
};
const extractAuthorizationHeader = (event) => {
    const header = event.headers?.authorization || event.headers?.Authorization;
    if (!header) {
        throw new errors_1.UnauthorizedError('Missing Authorization header');
    }
    return header;
};
const extractBearerToken = (authHeader) => {
    const [scheme, token] = authHeader.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
        throw new errors_1.UnauthorizedError('Authorization header must be Bearer token');
    }
    return token;
};
const authenticateRequest = async (event) => {
    const authHeader = extractAuthorizationHeader(event);
    const token = extractBearerToken(authHeader);
    const payload = await verifyJwt(token);
    logger_1.logger.debug('JWT verified', { sub: payload.sub });
    const user = await fetchUserFromDatabase(payload.sub);
    logger_1.logger.debug('User roles resolved', { userId: user.userId, roles: user.roles });
    return user;
};
exports.authenticateRequest = authenticateRequest;
const assertRole = (user, allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasRole = roles.some((role) => user.roles.includes(role));
    if (!hasRole) {
        throw new errors_1.ForbiddenError('User does not have sufficient privileges');
    }
};
exports.assertRole = assertRole;
//# sourceMappingURL=auth.js.map