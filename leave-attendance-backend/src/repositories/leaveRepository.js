import { db } from '../config/database.js';
import { calculateLeaveDays } from '../utils/dateUtils.js';

export class LeaveRepository {
  async getLeaveBalance(userId, year = new Date().getFullYear()) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await db.query(`
      SELECT 
        lb.balance_id,
        lb.policy_id,
        lp.name as policy_name,
        lb.balance_days,
        lb.year
      FROM leave_balances lb
      JOIN leave_policies lp ON lb.policy_id = lp.policy_id
      WHERE lb.user_id = $1 AND lb.year = $2
      ORDER BY lp.name
    `, [userId, year]);

    return result.rows;
  }

  async getLeaveRequests(filters = {}) {
    const {
      userId,
      status,
      startDate,
      endDate,
      page = 0,
      size = 20,
      sort = 'created_at,desc'
    } = filters;

    const [sortField, sortDir] = sort.split(',');
    const offset = page * size;

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'start_date', 'end_date', 'status'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const safeSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = `
      SELECT 
        lr.request_id,
        lr.user_id,
        u.display_name as user_name,
        u.email as user_email,
        lr.policy_id,
        lp.name as policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        (lr.end_date - lr.start_date + 1) as days,
        lr.reason,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN app_users u ON lr.user_id = u.id
      JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Only filter by userId if it's provided (not undefined/null)
    // For admins, if userId is undefined, show all requests
    if (userId !== undefined && userId !== null) {
      query += ` AND lr.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (status) {
      query += ` AND lr.status = $${paramIndex++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND lr.start_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND lr.end_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY lr.${safeSortField} ${safeSortDir}`;
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

  async getLeaveRequestById(requestId) {
    const result = await db.query(`
      SELECT 
        lr.request_id,
        lr.user_id,
        u.display_name as user_name,
        u.email as user_email,
        lr.policy_id,
        lp.name as policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        (lr.end_date - lr.start_date + 1) as days,
        lr.reason,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN app_users u ON lr.user_id = u.id
      JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      WHERE lr.request_id = $1
    `, [requestId]);

    return result.rows[0];
  }

  async createLeaveRequest(userId, policyId, startDate, endDate, reason) {
    const days = calculateLeaveDays(startDate, endDate);
    
    const result = await db.query(`
      INSERT INTO leave_requests (user_id, policy_id, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING *
    `, [userId, policyId, startDate, endDate, reason]);

    return result.rows[0];
  }

  async updateLeaveRequestStatus(requestId, status, actorId) {
    const result = await db.query(`
      UPDATE leave_requests
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      RETURNING *
    `, [status, requestId]);

    if (result.rows[0]) {
      await this.auditLeaveAction(requestId, status, actorId);
    }

    return result.rows[0];
  }

  async checkOverlappingLeaves(userId, startDate, endDate, excludeRequestId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE user_id = $1
        AND status = 'APPROVED'
        AND (start_date <= $3 AND end_date >= $2)
    `;
    const params = [userId, startDate, endDate];

    if (excludeRequestId) {
      query += ` AND request_id != $4`;
      params.push(excludeRequestId);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  async deductLeaveBalance(userId, policyId, days, year) {
    await db.query(`
      INSERT INTO leave_balances (user_id, policy_id, balance_days, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, policy_id, year)
      DO UPDATE SET balance_days = leave_balances.balance_days - $3,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, policyId, days, year]);
  }

  async auditLeaveAction(requestId, action, actorId, notes = null) {
    await db.query(`
      INSERT INTO leave_audit (request_id, action, actor_id, notes)
      VALUES ($1, $2, $3, $4)
    `, [requestId, action, actorId, notes]);
  }

  async getLeavePolicies() {
    const result = await db.query(`
      SELECT * FROM leave_policies WHERE is_active = true ORDER BY name
    `);
    return result.rows;
  }

  async initializeLeaveBalance(userId, policyId, annualLimit, year) {
    // Insert balance if it doesn't exist, or update if it does (idempotent)
    await db.query(`
      INSERT INTO leave_balances (user_id, policy_id, balance_days, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, policy_id, year) DO NOTHING
    `, [userId, policyId, annualLimit, year]);
  }
}

