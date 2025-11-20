import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { logger } from './logger';

interface DbSecret {
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
  ssl?: boolean;
}

interface DbSecretCache {
  value: DbSecret;
  expiresAt: number;
}

type QueryParams = unknown[] | undefined;

const REGION_FALLBACK = process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-southeast-2';
const secretsClient = new SecretsManagerClient({ region: REGION_FALLBACK });

let pool: Pool | null = null;
let poolPromise: Promise<Pool> | null = null;
let secretCache: DbSecretCache | null = null;

const getEnvDatabaseConfig = (): DbSecret | null => {
  const host = process.env.DB_HOST;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const dbname = process.env.DB_NAME;

  if (!host || !username || !password || !dbname) {
    return null;
  }

  const sslRaw = process.env.DB_SSL;
  const ssl = sslRaw ? sslRaw.toLowerCase() === 'true' : undefined;

  return {
    host,
    port: Number(process.env.DB_PORT || 5432),
    username,
    password,
    dbname,
    ssl,
  };
};

const parseSecret = (secretString: string | undefined): DbSecret => {
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
    ssl: typeof parsed.ssl === 'boolean' ? parsed.ssl : undefined,
  };
};

const getDbSecret = async (): Promise<DbSecret> => {
  if (secretCache && secretCache.expiresAt > Date.now()) {
    return secretCache.value;
  }

  const secretArn = process.env.DB_SECRET_ARN;

  if (!secretArn) {
    throw new Error('DB_SECRET_ARN environment variable is not set');
  }

  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await secretsClient.send(command);
  const secret = parseSecret(response.SecretString);

  secretCache = {
    value: secret,
    expiresAt: Date.now() + Number(process.env.DB_SECRET_CACHE_MS || 60_000),
  };

  return secret;
};

const createPool = async (): Promise<Pool> => {
  const config = getEnvDatabaseConfig() ?? (await getDbSecret());
  const maxConnections = Number(process.env.DB_POOL_MAX || 10);

  const sslOptions =
    typeof config.ssl === 'boolean'
      ? config.ssl
        ? { rejectUnauthorized: false }
        : undefined
      : process.env.DB_SSL?.toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined;

  const newPool = new Pool({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.dbname,
    max: maxConnections,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5_000),
    ssl: sslOptions,
  });

  newPool.on('error', (err) => {
    logger.error('Unexpected database error', undefined, { err });
  });

  return newPool;
};

export const getPool = async (): Promise<Pool> => {
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

export const query = async <T extends QueryResultRow = QueryResultRow>(
  sql: string | QueryConfig,
  params?: QueryParams,
): Promise<QueryResult<T>> => {
  const dbPool = await getPool();
  if (typeof sql === 'string') {
    return dbPool.query<T>(sql, params);
  }

  return dbPool.query<T>(sql);
};

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const dbPool = await getPool();
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

