import pg from 'pg';

const { Pool } = pg;

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file with DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

// Parse DATABASE_URL and use individual connection parameters
// This ensures the password is properly handled as a string
let dbConfig;
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  // Extract database name from pathname (remove leading slash)
  const database = dbUrl.pathname.slice(1);
  
  dbConfig = {
    user: dbUrl.username,
    password: dbUrl.password || '', // Ensure password is always a string
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 5432,
    database: database,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  };
  
  // Log connection info (without password) for debugging
  console.log(`Database: ${dbUrl.protocol}//${dbUrl.username}@${dbUrl.hostname}:${dbUrl.port}/${database}`);
} catch (error) {
  console.error('ERROR: Invalid DATABASE_URL format:', error.message);
  console.error('Expected format: postgresql://user:password@host:port/database');
  process.exit(1);
}

const pool = new Pool(dbConfig);

// Wrap pool with X-Ray if in AWS environment and X-Ray SDK is available
// Note: X-Ray SDK packages (@aws-xray-sdk-core, @aws-xray-sdk-postgres) are optional
// due to npm installation issues with npm 11.6.2. The app will work without them, 
// but X-Ray tracing will be disabled. 
// To enable X-Ray, manually install after npm install completes:
//   npm install @aws-xray-sdk-core@3.8.0 @aws-xray-sdk-postgres@3.8.0
// Or use an alternative package manager like yarn or pnpm.

let db = pool;

// Try to load X-Ray SDK synchronously if available
// This will fail gracefully if packages are not installed
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    // Use dynamic import with immediate await (requires top-level await support)
    // If X-Ray packages are not installed, this will be skipped
    const xrayModule = await import('@aws-xray-sdk-postgres').catch(() => null);
    if (xrayModule?.default) {
      db = xrayModule.default.capturePostgres(pool);
    }
  } catch (error) {
    // X-Ray SDK not available, continue without tracing
    // This is expected if packages are not installed
  }
}

export { db };

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

