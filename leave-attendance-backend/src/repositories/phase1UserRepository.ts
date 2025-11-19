import { Pool, PoolClient } from 'pg';
import { logger } from '../common/logger';

interface Phase1UserRow {
  id: number;
  cognito_sub: string;
  email: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Phase1UserRecord {
  id: number;
  cognitoSub: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository to access Phase 1 database (app_users table)
 * Phase 1 is the source of truth for user data
 */
export class Phase1UserRepository {
  private pool: Pool | null = null;

  constructor() {
    // Initialize Phase 1 database connection if configured
    // Try JDBC URL format first, then fall back to individual env vars
    const phase1Url = process.env.PHASE1_DATASOURCE_URL;
    const phase1User = process.env.PHASE1_DATASOURCE_USERNAME;
    const phase1Pass = process.env.PHASE1_DATASOURCE_PASSWORD;

    // Also check if Phase 1 and Phase 2 use the same database (common case)
    const phase2Host = process.env.DB_HOST;
    const phase2Port = process.env.DB_PORT;
    const phase2User = process.env.DB_USER;
    const phase2Pass = process.env.DB_PASS;
    const phase2Name = process.env.DB_NAME;
    const phase2Ssl = process.env.DB_SSL;

    let host: string | undefined;
    let port: number | undefined;
    let user: string | undefined;
    let password: string | undefined;
    let database: string | undefined;
    let ssl: boolean | undefined;

    if (phase1Url && phase1User && phase1Pass) {
      // Parse JDBC URL: jdbc:postgresql://host:port/database
      const urlMatch = phase1Url.match(/jdbc:postgresql:\/\/([^:]+):(\d+)\/(.+)/);
      if (urlMatch) {
        const [, matchedHost, matchedPort, matchedDatabase] = urlMatch;
        host = matchedHost;
        port = parseInt(matchedPort, 10);
        database = matchedDatabase;
        user = phase1User;
        password = phase1Pass;
      }
    } else if (phase2Host && phase2User && phase2Pass && phase2Name) {
      // Fall back to Phase 2 database (if same database)
      host = phase2Host;
      port = parseInt(phase2Port || '5432', 10);
      user = phase2User;
      password = phase2Pass;
      database = phase2Name;
      ssl = phase2Ssl?.toLowerCase() === 'true';
      logger.info('Using Phase 2 database connection for Phase 1 (assuming same database)');
    }

    if (host && port && user && password && database) {
      try {
        this.pool = new Pool({
          host,
          port,
          user,
          password,
          database,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: ssl ? { rejectUnauthorized: false } : undefined,
        });

        this.pool.on('error', (err) => {
          logger.error('Phase 1 database connection error', undefined, { err });
        });

        logger.info('Phase 1 database connection initialized', {
          host,
          port,
          database,
        });
      } catch (error) {
        logger.error('Failed to initialize Phase 1 database connection', undefined, { error });
      }
    } else {
      logger.warn('Phase 1 database configuration not provided. User sync from Phase 1 will be disabled.');
    }
  }

  /**
   * Find user in Phase 1 database by cognito_sub
   * Returns null if user doesn't exist or Phase 1 is not configured
   */
  async findByCognitoSub(cognitoSub: string): Promise<Phase1UserRecord | null> {
    if (!this.pool) {
      logger.debug('Phase 1 database not configured, skipping lookup');
      return null;
    }

    try {
      const result = await this.pool.query<Phase1UserRow>(
        `
        SELECT id, cognito_sub, email, display_name, created_at, updated_at
        FROM app_users
        WHERE cognito_sub = $1 AND is_active = true
        LIMIT 1
        `,
        [cognitoSub],
      );

      if (result.rows.length === 0) {
        logger.debug('User not found in Phase 1 database', { cognitoSub });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        cognitoSub: row.cognito_sub,
        email: row.email,
        displayName: row.display_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to query Phase 1 database', undefined, { error, cognitoSub });
      // Don't throw - return null so Phase 2 can continue
      return null;
    }
  }

  /**
   * Check if user exists in Phase 1 database
   */
  async exists(cognitoSub: string): Promise<boolean> {
    const user = await this.findByCognitoSub(cognitoSub);
    return user !== null;
  }
}

