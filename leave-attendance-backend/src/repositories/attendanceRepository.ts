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
        al.user_name,
        al.user_email,
        al.user_team_id,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        al.latitude,
        al.longitude,
        al.source,
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
        log_id,
        user_id,
        user_name,
        user_email,
        user_team_id,
        clock_in,
        clock_out,
        duration_minutes,
        latitude,
        longitude,
        source,
        created_at
      FROM attendance_logs
      WHERE user_id = $1 AND clock_out IS NULL
      ORDER BY clock_in DESC
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
      INSERT INTO attendance_logs (user_id, user_name, user_email, user_team_id, clock_in, latitude, longitude, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        log_id,
        user_id,
        user_name,
        user_email,
        user_team_id,
        clock_in,
        clock_out,
        duration_minutes,
        latitude,
        longitude,
        source,
        created_at
      `,
      [
        params.userId,
        params.userName ?? null,
        params.userEmail ?? null,
        params.userTeamId,
        params.clockIn,
        params.latitude ?? null,
        params.longitude ?? null,
        params.source ?? null,
      ],
    );

    return mapAttendanceLog(result.rows[0]);
  }

  async updateClockOut(params: {
    logId: number;
    userId: number;
    clockOut: string;
    durationMinutes: number;
  }): Promise<AttendanceLog> {
    const result = await query<AttendanceRow>(
      `
      UPDATE attendance_logs
      SET clock_out = $1,
          duration_minutes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE log_id = $3 AND user_id = $4
      RETURNING
        log_id,
        user_id,
        user_name,
        user_email,
        user_team_id,
        clock_in,
        clock_out,
        duration_minutes,
        latitude,
        longitude,
        source,
        created_at
      `,
      [params.clockOut, params.durationMinutes, params.logId, params.userId],
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
          log_id,
          user_id,
          user_name,
          user_email,
          user_team_id,
          clock_in,
          clock_out,
          duration_minutes,
          latitude,
          longitude,
          source,
          created_at
        FROM attendance_logs
        WHERE user_id = $1 AND clock_out IS NULL
        ORDER BY clock_in DESC
        LIMIT 1
        FOR UPDATE
        `,
        [userId],
      );

      if (openLog.rowCount === 0) {
        throw new Error('No open attendance session found');
      }

      const log = openLog.rows[0];

      const updated = await client.query<AttendanceRow>(
        `
        UPDATE attendance_logs
        SET clock_out = $1,
            duration_minutes = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE log_id = $3
        RETURNING
          log_id,
          user_id,
          user_name,
          user_email,
          user_team_id,
          clock_in,
          clock_out,
          duration_minutes,
          latitude,
          longitude,
          source,
          created_at
        `,
        [update.clockOut, update.durationMinutes, log.log_id],
      );

      return mapAttendanceLog(updated.rows[0]);
    });
  }
}

