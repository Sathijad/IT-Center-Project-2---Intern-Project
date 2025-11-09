"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceRepository = void 0;
const db_1 = require("../common/db");
const pagination_1 = require("../common/pagination");
const attendanceSortFields = ['clock_in', 'clock_out', 'created_at'];
const mapAttendanceLog = (row) => ({
    logId: row.log_id,
    userId: row.user_id,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    durationMinutes: row.duration_minutes,
    latitude: row.latitude,
    longitude: row.longitude,
    source: row.source,
    createdAt: row.created_at,
});
class AttendanceRepository {
    async getLogs(filters) {
        const pagination = (0, pagination_1.normalizePagination)({
            page: filters.page?.toString(),
            size: filters.size?.toString(),
            sort: filters.sort,
        });
        const { field, direction } = (0, pagination_1.parseSort)(pagination.sort, attendanceSortFields, 'clock_in,desc');
        const offset = (pagination.page - 1) * pagination.size;
        const params = [];
        let index = 1;
        let baseQuery = `
      FROM attendance_logs al
      INNER JOIN app_users u ON al.user_id = u.id
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
            (0, db_1.query)(dataQuery, params),
            (0, db_1.query)(`SELECT COUNT(*) ${baseQuery}`, params.slice(0, -2)),
        ]);
        const total = Number(count.rows[0]?.count ?? 0);
        return (0, pagination_1.buildPaginationResult)(data.rows.map(mapAttendanceLog), pagination, total);
    }
    async getOpenLog(userId) {
        const result = await (0, db_1.query)(`
      SELECT
        log_id,
        user_id,
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
      `, [userId]);
        if (result.rowCount === 0) {
            return null;
        }
        return mapAttendanceLog(result.rows[0]);
    }
    async insertClockIn(params) {
        const result = await (0, db_1.query)(`
      INSERT INTO attendance_logs (user_id, clock_in, latitude, longitude, source)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        log_id,
        user_id,
        clock_in,
        clock_out,
        duration_minutes,
        latitude,
        longitude,
        source,
        created_at
      `, [params.userId, params.clockIn, params.latitude ?? null, params.longitude ?? null, params.source ?? null]);
        return mapAttendanceLog(result.rows[0]);
    }
    async updateClockOut(params) {
        const result = await (0, db_1.query)(`
      UPDATE attendance_logs
      SET clock_out = $1,
          duration_minutes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE log_id = $3 AND user_id = $4
      RETURNING
        log_id,
        user_id,
        clock_in,
        clock_out,
        duration_minutes,
        latitude,
        longitude,
        source,
        created_at
      `, [params.clockOut, params.durationMinutes, params.logId, params.userId]);
        if (result.rowCount === 0) {
            throw new Error('Attendance log not found');
        }
        return mapAttendanceLog(result.rows[0]);
    }
    async closeOpenSessionWithTransaction(userId, update) {
        return (0, db_1.withTransaction)(async (client) => {
            const openLog = await client.query(`
        SELECT
          log_id,
          user_id,
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
        `, [userId]);
            if (openLog.rowCount === 0) {
                throw new Error('No open attendance session found');
            }
            const log = openLog.rows[0];
            const updated = await client.query(`
        UPDATE attendance_logs
        SET clock_out = $1,
            duration_minutes = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE log_id = $3
        RETURNING
          log_id,
          user_id,
          clock_in,
          clock_out,
          duration_minutes,
          latitude,
          longitude,
          source,
          created_at
        `, [update.clockOut, update.durationMinutes, log.log_id]);
            return mapAttendanceLog(updated.rows[0]);
        });
    }
}
exports.AttendanceRepository = AttendanceRepository;
//# sourceMappingURL=attendanceRepository.js.map