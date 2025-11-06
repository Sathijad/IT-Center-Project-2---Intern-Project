import { db } from '../config/database.js';

export class AttendanceRepository {
  async getAttendanceLogs(filters = {}) {
    const {
      userId,
      startDate,
      endDate,
      page = 0,
      size = 20,
      sort = 'clock_in,desc'
    } = filters;

    // If userId is provided but undefined, return empty result
    if (filters.hasOwnProperty('userId') && !userId) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: size
      };
    }

    const [sortField, sortDir] = sort.split(',');
    const offset = page * size;

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['clock_in', 'clock_out', 'created_at'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'clock_in';
    const safeSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = `
      SELECT 
        al.log_id,
        al.user_id,
        u.display_name as user_name,
        al.clock_in,
        al.clock_out,
        al.duration_minutes,
        al.geo_location,
        al.created_at
      FROM attendance_logs al
      JOIN app_users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND DATE(al.clock_in) >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(al.clock_in) <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.${safeSortField} ${safeSortDir}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, offset);

    const result = await db.query(query, params);

    // Get total count (remove ORDER BY and LIMIT/OFFSET)
    const countQuery = query
      .replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM')
      .replace(/ORDER BY[\s\S]*$/, '');
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
    const countResult = await db.query(countQuery, countParams);
    const totalElements = parseInt(countResult.rows[0]?.count || 0);

    return {
      content: result.rows,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      page,
      size
    };
  }

  async getActiveClockIn(userId) {
    const result = await db.query(`
      SELECT * FROM attendance_logs
      WHERE user_id = $1 AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `, [userId]);

    return result.rows[0];
  }

  async createClockIn(userId, clockIn, geoLocation) {
    const result = await db.query(`
      INSERT INTO attendance_logs (user_id, clock_in, geo_location)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, clockIn, JSON.stringify(geoLocation)]);

    return result.rows[0];
  }

  async updateClockOut(logId, clockOut, durationMinutes, geoLocation = null) {
    const updateGeo = geoLocation ? `, geo_location = geo_location || $4::jsonb` : '';
    const params = geoLocation 
      ? [clockOut, durationMinutes, logId, JSON.stringify(geoLocation)]
      : [clockOut, durationMinutes, logId];

    const result = await db.query(`
      UPDATE attendance_logs
      SET clock_out = $1, duration_minutes = $2${updateGeo}
      WHERE log_id = $3
      RETURNING *
    `, params);

    return result.rows[0];
  }

  async calculateDuration(clockIn, clockOut) {
    const diff = new Date(clockOut) - new Date(clockIn);
    return Math.floor(diff / 1000 / 60); // minutes
  }
}

