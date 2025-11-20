import { query } from '../common/db';
import { logger } from '../common/logger';

interface UserRow {
  id: number;
  cognito_sub: string;
  email: string | null;
  display_name: string | null;
}

export interface UserRecord {
  userId: number;
  cognitoSub: string;
  email: string | null;
  displayName: string | null;
}

const mapUser = (row: UserRow): UserRecord => ({
  userId: row.id,
  cognitoSub: row.cognito_sub,
  email: row.email,
  displayName: row.display_name,
});

export class UserRepository {
  async findByCognitoSub(cognitoSub: string): Promise<UserRecord | null> {
    const result = await query<UserRow>(
      `
      SELECT id, cognito_sub, email, display_name
      FROM app_users
      WHERE cognito_sub = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [cognitoSub],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }

  async findById(userId: number): Promise<UserRecord | null> {
    const result = await query<UserRow>(
      `
      SELECT id, cognito_sub, email, display_name
      FROM app_users
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  }
}

