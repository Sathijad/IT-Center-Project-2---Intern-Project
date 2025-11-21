import { PoolClient } from 'pg';
import { query, withTransaction } from '../common/db';
import { AttendanceFilters, AttendanceLog } from '../domain/models';
import { buildPaginationResult, normalizePagination, parseSort } from '../common/pagination';

interface AttendanceRow {
  log_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  user_team_id: number | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  created_at: string;
}

const attendanceSortFields = ['clock_in', 'clock_out', 'created_at'] as const;

const mapAttendanceLog = (row: AttendanceRow): AttendanceLog => ({
  logId: row.log_id,
  userId: row.user_id,
  userName: row.user_name,
  userEmail: row.user_email,
  userTeamId: row.user_team_id,
  clockIn: row.clock_in,
  clockOut: row.clock_out,
  durationMinutes: row.duration_minutes,
  latitude: row.latitude,
  longitude: row.longitude,
  source: row.source,
  createdAt: row.created_at,
});

export class AttendanceRepository {
  async getLogs(filters: AttendanceFilters) {
    const pagination = normalizePagination({
      page: filters.page?.toString(),
      size: filters.size?.toString(),
      sort: filters.sort,
    });

    const { field, direction } = parseSort(pagination.sort, attendanceSortFields, 'clock_in,desc');
    const offset = (pagination.page! - 1) * pagination.size!;

    const params: unknown[] = [];
    let index = 1;

    let baseQuery = `
      FROM attendance_logs al
      LEFT JOIN app_users au ON al.user_id = au.id
      WHERE 1=1
    `;

    if (filters.userId !== undefined && filters.userId !== null) {
      baseQuery += ` AND al.user_id = $${index++}`;
      params.push(filters.userId);
    }

    if (filters.from) {
      baseQuery += ` AND al.clock_in >= $${index++}`;
      params.push(filters.from);
    }

    if (filters.to) {
      baseQuery += ` AND (al.clock_out <= $${index++} OR al.clock_out IS NULL)`;
      params.push(filters.to);
    }

    const dataQuery = `
      SELECT
        al.log_id,
        al.user_id,
        COALESCE(au.display_name, '') AS user_name,
        COALESCE(au.email, '') AS user_email,
        NULL AS user_team_id,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        NULL AS latitude,
        NULL AS longitude,
        NULL AS source,
        al.created_at
      ${baseQuery}
      ORDER BY al.${field} ${direction}
      LIMIT $${index++} OFFSET $${index++}
    `;

    params.push(pagination.size, offset);

    const [data, count] = await Promise.all([
      query<AttendanceRow>(dataQuery, params),
      query<{ count: string }>(`SELECT COUNT(*) ${baseQuery}`, params.slice(0, -2)),
    ]);

    const total = Number(count.rows[0]?.count ?? 0);

    return buildPaginationResult(data.rows.map(mapAttendanceLog), pagination, total);
  }

  async getOpenLog(userId: number): Promise<AttendanceLog | null> {
    const result = await query<AttendanceRow>(
      `
      SELECT
        al.log_id,
        al.user_id,
        COALESCE(au.display_name, '') AS user_name,
        COALESCE(au.email, '') AS user_email,
        NULL AS user_team_id,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        NULL AS latitude,
        NULL AS longitude,
        NULL AS source,
        al.created_at
      FROM attendance_logs al
      LEFT JOIN app_users au ON al.user_id = au.id
      WHERE al.user_id = $1 AND al.clock_out IS NULL
      ORDER BY al.clock_in DESC
      LIMIT 1
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapAttendanceLog(result.rows[0]);
  }

  async insertClockIn(params: {
    userId: number;
    userName: string | null;
    userEmail: string | null;
    userTeamId: number | null;
    clockIn: string;
    latitude?: number | null;
    longitude?: number | null;
    source?: string | null;
  }): Promise<AttendanceLog> {
    const result = await query<AttendanceRow>(
      `
      INSERT INTO attendance_logs (user_id, clock_in)
      VALUES ($1, $2)
      RETURNING
        log_id,
        user_id,
        clock_in,
        clock_out,
        duration_minutes,
        created_at
      `,
      [params.userId, params.clockIn],
    );

    // Fetch with user details via JOIN
    const fullResult = await query<AttendanceRow>(
      `
      SELECT
        al.log_id,
        al.user_id,
        COALESCE(au.display_name, '') AS user_name,
        COALESCE(au.email, '') AS user_email,
        NULL AS user_team_id,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        NULL AS latitude,
        NULL AS longitude,
        NULL AS source,
        al.created_at
      FROM attendance_logs al
      LEFT JOIN app_users au ON al.user_id = au.id
      WHERE al.log_id = $1
      `,
      [result.rows[0].log_id],
    );

    return mapAttendanceLog(result.rows[0]);
  }

  async updateClockOut(params: {
    logId: number;
    userId: number;
    clockOut: string;
    durationMinutes: number;
  }): Promise<AttendanceLog> {
    await query(
      `
      UPDATE attendance_logs
      SET clock_out = $1,
          duration_minutes = $2
      WHERE log_id = $3 AND user_id = $4
      `,
      [params.clockOut, params.durationMinutes, params.logId, params.userId],
    );

    // Fetch with user details via JOIN
    const result = await query<AttendanceRow>(
      `
      SELECT
        al.log_id,
        al.user_id,
        COALESCE(au.display_name, '') AS user_name,
        COALESCE(au.email, '') AS user_email,
        NULL AS user_team_id,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        NULL AS latitude,
        NULL AS longitude,
        NULL AS source,
        al.created_at
      FROM attendance_logs al
      LEFT JOIN app_users au ON al.user_id = au.id
      WHERE al.log_id = $1
      `,
      [params.logId],
    );

    if (result.rowCount === 0) {
      throw new Error('Attendance log not found');
    }

    return mapAttendanceLog(result.rows[0]);
  }

  async closeOpenSessionWithTransaction(
    userId: number,
    update: { clockOut: string; durationMinutes: number },
  ): Promise<AttendanceLog> {
    return withTransaction(async (client: PoolClient) => {
      const openLog = await client.query<AttendanceRow>(
        `
        SELECT
          al.log_id,
          al.user_id,
          COALESCE(au.display_name, '') AS user_name,
          COALESCE(au.email, '') AS user_email,
          NULL AS user_team_id,
          al.clock_in,
          al.clock_out,
          al.duration_minutes,
          NULL AS latitude,
          NULL AS longitude,
          NULL AS source,
          al.created_at
        FROM attendance_logs al
        LEFT JOIN app_users au ON al.user_id = au.id
        WHERE al.user_id = $1 AND al.clock_out IS NULL
        ORDER BY al.clock_in DESC
        LIMIT 1
        FOR UPDATE OF al
        `,
        [userId],
      );

      if (openLog.rowCount === 0) {
        throw new Error('No open attendance session found');
      }

      const log = openLog.rows[0];

      await client.query(
        `
        UPDATE attendance_logs
        SET clock_out = $1,
            duration_minutes = $2
        WHERE log_id = $3
        `,
        [update.clockOut, update.durationMinutes, log.log_id],
      );

      // Fetch with user details via JOIN
      const updated = await client.query<AttendanceRow>(
        `
        SELECT
          al.log_id,
          al.user_id,
          COALESCE(au.display_name, '') AS user_name,
          COALESCE(au.email, '') AS user_email,
          NULL AS user_team_id,
          al.clock_in,
          al.clock_out,
          al.duration_minutes,
          NULL AS latitude,
          NULL AS longitude,
          NULL AS source,
          al.created_at
        FROM attendance_logs al
        LEFT JOIN app_users au ON al.user_id = au.id
        WHERE al.log_id = $1
        `,
        [log.log_id],
      );

      return mapAttendanceLog(updated.rows[0]);
    });
  }
}

