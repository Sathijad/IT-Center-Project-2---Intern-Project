import pg from 'pg';
import AWSXRayPostgres from '@aws-xray-sdk-postgres';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Wrap pool with X-Ray if in AWS environment
export const db = process.env.AWS_LAMBDA_FUNCTION_NAME
  ? AWSXRayPostgres.capturePostgres(pool)
  : pool;

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

