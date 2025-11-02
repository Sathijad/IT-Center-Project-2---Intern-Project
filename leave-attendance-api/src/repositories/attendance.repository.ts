import { query, queryOne } from '../lib/db';
import { AttendanceLog } from '../types';

export class AttendanceRepository {
  async createClockIn(data: {
    userId: number;
    clockIn: Date;
    latitude?: number;
    longitude?: number;
    source?: string;
  }): Promise<AttendanceLog> {
    const result = await query<AttendanceLog>(
      `INSERT INTO attendance_logs (user_id, clock_in, latitude, longitude, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.userId,
        data.clockIn,
        data.latitude || null,
        data.longitude || null,
        data.source || 'WEB',
      ]
    );
    return result[0];
  }

  async findActiveClockIn(userId: number): Promise<AttendanceLog | null> {
    return queryOne<AttendanceLog>(
      `SELECT * FROM attendance_logs
       WHERE user_id = $1 AND clock_out IS NULL
       ORDER BY clock_in DESC
       LIMIT 1`,
      [userId]
    );
  }

  async updateClockOut(
    id: number,
    clockOut: Date,
    source?: string
  ): Promise<AttendanceLog | null> {
    // Calculate duration in minutes
    const result = await query<AttendanceLog>(
      `UPDATE attendance_logs
       SET clock_out = $2,
           duration_minutes = EXTRACT(EPOCH FROM ($2 - clock_in)) / 60,
           source = COALESCE($3, source)
       WHERE id = $1
       RETURNING *`,
      [id, clockOut, source]
    );
    return result[0] || null;
  }

  async findAttendanceLogs(filters: {
    userId?: number;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    size?: number;
  }): Promise<{ data: AttendanceLog[]; total: number }> {
    const page = filters.page || 1;
    const size = filters.size || 20;
    const offset = (page - 1) * size;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    if (filters.fromDate) {
      whereClause += ` AND clock_in >= $${paramIndex++}`;
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      whereClause += ` AND clock_in <= $${paramIndex++}`;
      params.push(filters.toDate);
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM attendance_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count, 10);

    // Get paginated data
    params.push(size, offset);
    const data = await query<AttendanceLog>(
      `SELECT * FROM attendance_logs ${whereClause} 
       ORDER BY clock_in DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return { data, total };
  }

  async findAttendanceLogById(id: number): Promise<AttendanceLog | null> {
    return queryOne<AttendanceLog>(
      'SELECT * FROM attendance_logs WHERE id = $1',
      [id]
    );
  }

  async findTodayAttendance(userId: number): Promise<AttendanceLog | null> {
    return queryOne<AttendanceLog>(
      `SELECT * FROM attendance_logs
       WHERE user_id = $1 
         AND DATE(clock_in) = CURRENT_DATE
       ORDER BY clock_in DESC
       LIMIT 1`,
      [userId]
    );
  }
}

