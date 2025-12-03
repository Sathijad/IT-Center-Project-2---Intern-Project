import { query } from '../common/db';

interface AppUserRow {
  id: number;
  cognito_sub: string;
  email: string | null;
  display_name: string | null;
  roles?: string[];
}

export interface UserRecord {
  userId: number;
  cognitoSub: string;
  email: string | null;
  displayName: string | null;
  roles?: string[];
}

const mapUser = (row: AppUserRow): UserRecord => ({
  userId: row.id,
  cognitoSub: row.cognito_sub,
  email: row.email,
  displayName: row.display_name,
  roles: row.roles && Array.isArray(row.roles) ? row.roles : [],
});

export class UserRepository {
  async findByCognitoSub(cognitoSub: string): Promise<UserRecord | null> {
    const result = await query<{
      id: number;
      cognito_sub: string;
      email: string | null;
      display_name: string | null;
      roles: string[];
    }>(
      `
      SELECT 
        u.id, 
        u.cognito_sub, 
        u.email, 
        u.display_name,
        COALESCE(
          array_agg(DISTINCT r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::text[]
        ) as roles
      FROM app_users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.cognito_sub = $1
        AND u.is_active = TRUE
      GROUP BY u.id, u.cognito_sub, u.email, u.display_name
      LIMIT 1
      `,
      [cognitoSub],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.id,
      cognitoSub: row.cognito_sub,
      email: row.email,
      displayName: row.display_name,
      roles: Array.isArray(row.roles) ? row.roles : [],
    };
  }
}


