import { query } from '../common/db';

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

  async upsertFromClaims(params: {
    cognitoSub: string;
    email?: string | null;
    displayName?: string | null;
    teamId?: number | null;
  }): Promise<UserRecord> {
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

    return mapUser(result.rows[0]);
  }
}


