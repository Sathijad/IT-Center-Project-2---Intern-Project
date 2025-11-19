import { query } from '../common/db';
import { Phase1UserRepository } from './phase1UserRepository';
import { logger } from '../common/logger';

interface UserRow {
  user_id: number;
  cognito_sub: string;
  email: string | null;
  display_name: string | null;
  team_id: number | null;
}

export interface UserRecord {
  userId: number;
  cognitoSub: string;
  email: string | null;
  displayName: string | null;
  teamId: number | null;
}

const mapUser = (row: UserRow): UserRecord => ({
  userId: row.user_id,
  cognitoSub: row.cognito_sub,
  email: row.email,
  displayName: row.display_name,
  teamId: row.team_id,
});

export class UserRepository {
  private phase1UserRepository: Phase1UserRepository;

  constructor() {
    this.phase1UserRepository = new Phase1UserRepository();
  }
  async findByCognitoSub(cognitoSub: string): Promise<UserRecord | null> {
    const result = await query<UserRow>(
      `
      SELECT user_id, cognito_sub, email, display_name, team_id
      FROM users
      WHERE cognito_sub = $1
      LIMIT 1
      `,
      [cognitoSub],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }

  /**
   * Upsert user from JWT claims.
   * IMPORTANT: First checks Phase 1 database - user MUST exist in Phase 1 first.
   * If user doesn't exist in Phase 1, logs warning and creates placeholder in Phase 2.
   */
  async upsertFromClaims(params: {
    cognitoSub: string;
    email?: string | null;
    displayName?: string | null;
    teamId?: number | null;
  }): Promise<UserRecord> {
    // First, check if user exists in Phase 1 database (source of truth)
    const phase1User = await this.phase1UserRepository.findByCognitoSub(params.cognitoSub);

    if (phase1User) {
      // User exists in Phase 1 - use Phase 1 data as source of truth
      logger.info('User found in Phase 1, syncing to Phase 2', {
        cognitoSub: params.cognitoSub,
        phase1Id: phase1User.id,
        phase1Email: phase1User.email,
      });

      // Use Phase 1 data, but allow Phase 2-specific fields (team_id) from claims
      const result = await query<UserRow>(
        `
        INSERT INTO users (cognito_sub, email, display_name, team_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cognito_sub) DO UPDATE
        SET
          email = COALESCE(EXCLUDED.email, users.email),
          display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          team_id = COALESCE(EXCLUDED.team_id, users.team_id),
          updated_at = CURRENT_TIMESTAMP
        RETURNING user_id, cognito_sub, email, display_name, team_id
        `,
        [
          params.cognitoSub,
          phase1User.email, // Use Phase 1 email (source of truth)
          phase1User.displayName, // Use Phase 1 display_name (source of truth)
          params.teamId ?? null, // team_id is Phase 2 specific
        ],
      );

      return mapUser(result.rows[0]);
    } else {
      // User doesn't exist in Phase 1 - this is a problem!
      logger.warn(
        'User not found in Phase 1 database. User should be created in Phase 1 first via web app login.',
        {
          cognitoSub: params.cognitoSub,
          email: params.email,
        },
      );

      // Still create in Phase 2 to prevent errors, but log warning
      // This allows the system to continue working, but admin should investigate
      const result = await query<UserRow>(
        `
        INSERT INTO users (cognito_sub, email, display_name, team_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cognito_sub) DO UPDATE
        SET
          email = COALESCE(EXCLUDED.email, users.email),
          display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          team_id = COALESCE(EXCLUDED.team_id, users.team_id),
          updated_at = CURRENT_TIMESTAMP
        RETURNING user_id, cognito_sub, email, display_name, team_id
        `,
        [params.cognitoSub, params.email ?? null, params.displayName ?? null, params.teamId ?? null],
      );

      logger.warn('Created user in Phase 2 without Phase 1 record. This should be investigated.', {
        cognitoSub: params.cognitoSub,
        phase2UserId: result.rows[0].user_id,
      });

      return mapUser(result.rows[0]);
    }
  }
}


