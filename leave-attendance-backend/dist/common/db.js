"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = exports.query = exports.getPool = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const pg_1 = require("pg");
const logger_1 = require("./logger");
const REGION_FALLBACK = process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-southeast-2';
const secretsClient = new client_secrets_manager_1.SecretsManagerClient({ region: REGION_FALLBACK });
let pool = null;
let poolPromise = null;
let secretCache = null;
const parseSecret = (secretString) => {
    if (!secretString) {
        throw new Error('Database secret string is empty');
    }
    const parsed = JSON.parse(secretString);
    if (!parsed.host || !parsed.username || !parsed.password || !parsed.dbname) {
        throw new Error('Database secret is missing required properties');
    }
    return {
        host: parsed.host,
        port: Number(parsed.port || 5432),
        username: parsed.username,
        password: parsed.password,
        dbname: parsed.dbname,
    };
};
const getDbSecret = async () => {
    if (secretCache && secretCache.expiresAt > Date.now()) {
        return secretCache.value;
    }
    const secretArn = process.env.DB_SECRET_ARN;
    if (!secretArn) {
        throw new Error('DB_SECRET_ARN environment variable is not set');
    }
    const command = new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsClient.send(command);
    const secret = parseSecret(response.SecretString);
    secretCache = {
        value: secret,
        expiresAt: Date.now() + Number(process.env.DB_SECRET_CACHE_MS || 60_000),
    };
    return secret;
};
const createPool = async () => {
    const secret = await getDbSecret();
    const maxConnections = Number(process.env.DB_POOL_MAX || 10);
    const host = process.env.DB_PROXY_ENDPOINT ?? secret.host;
    const newPool = new pg_1.Pool({
        host,
        port: secret.port,
        user: secret.username,
        password: secret.password,
        database: secret.dbname,
        max: maxConnections,
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
        connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5_000),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    newPool.on('error', (err) => {
        logger_1.logger.error('Unexpected database error', undefined, { err });
    });
    return newPool;
};
const getPool = async () => {
    if (!pool) {
        if (!poolPromise) {
            poolPromise = createPool()
                .then((createdPool) => {
                pool = createdPool;
                return createdPool;
            })
                .finally(() => {
                poolPromise = null;
            });
        }
        pool = await poolPromise;
    }
    return pool;
};
exports.getPool = getPool;
const query = async (sql, params) => {
    const dbPool = await (0, exports.getPool)();
    if (typeof sql === 'string') {
        return dbPool.query(sql, params);
    }
    return dbPool.query(sql);
};
exports.query = query;
const withTransaction = async (callback) => {
    const dbPool = await (0, exports.getPool)();
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.withTransaction = withTransaction;
//# sourceMappingURL=db.js.map