"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRepository = void 0;
const db_1 = require("../common/db");
const pagination_1 = require("../common/pagination");
const leaveSortFields = ['created_at', 'updated_at', 'start_date', 'end_date', 'status'];
const mapLeaveBalance = (row) => ({
    balanceId: row.balance_id,
    policyId: row.policy_id,
    policyName: row.policy_name,
    balanceDays: Number(row.balance_days),
    year: row.year,
});
const mapLeaveRequest = (row) => ({
    requestId: row.request_id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    policyId: row.policy_id,
    policyName: row.policy_name,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    halfDay: row.half_day,
    reason: row.reason,
    graphEventId: row.graph_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    daysRequested: Number(row.days_requested),
});
class LeaveRepository {
    async getLeaveBalances(userId, year) {
        const result = await (0, db_1.query)(`
      SELECT
        lb.balance_id,
        lb.policy_id,
        lp.name AS policy_name,
        lb.balance_days,
        lb.year
      FROM leave_balances lb
      INNER JOIN leave_policies lp ON lb.policy_id = lp.policy_id
      WHERE lb.user_id = $1 AND lb.year = $2
      ORDER BY lp.name ASC
      `, [userId, year]);
        return result.rows.map(mapLeaveBalance);
    }
    async getLeavePolicies() {
        const result = await (0, db_1.query)(`SELECT policy_id, name, annual_limit FROM leave_policies WHERE is_active = true ORDER BY name`);
        return result.rows;
    }
    async initializeLeaveBalance(userId, policyId, annualLimit, year) {
        await (0, db_1.query)(`
      INSERT INTO leave_balances (user_id, policy_id, balance_days, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, policy_id, year)
      DO NOTHING
      `, [userId, policyId, annualLimit, year]);
    }
    async getLeaveRequests(filters) {
        const pagination = (0, pagination_1.normalizePagination)({
            page: filters.page?.toString(),
            size: filters.size?.toString(),
            sort: filters.sort,
        });
        const { field, direction } = (0, pagination_1.parseSort)(pagination.sort, leaveSortFields);
        const offset = (pagination.page - 1) * pagination.size;
        const params = [];
        let index = 1;
        let baseQuery = `
      FROM leave_requests lr
      INNER JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      INNER JOIN app_users u ON lr.user_id = u.id
      WHERE 1=1
    `;
        if (filters.userId !== undefined && filters.userId !== null) {
            baseQuery += ` AND lr.user_id = $${index++}`;
            params.push(filters.userId);
        }
        if (filters.status) {
            baseQuery += ` AND lr.status = $${index++}`;
            params.push(filters.status);
        }
        if (filters.startDate) {
            baseQuery += ` AND lr.start_date >= $${index++}`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            baseQuery += ` AND lr.end_date <= $${index++}`;
            params.push(filters.endDate);
        }
        const dataQuery = `
      SELECT
        lr.request_id,
        lr.user_id,
        u.email AS user_email,
        u.display_name AS user_name,
        lr.policy_id,
        lp.name AS policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        lr.half_day,
        lr.reason,
        lr.graph_event_id,
        lr.created_at,
        lr.updated_at,
        CASE
          WHEN lr.half_day THEN 0.5
          ELSE (lr.end_date - lr.start_date) + 1
        END AS days_requested
      ${baseQuery}
      ORDER BY lr.${field} ${direction}
      LIMIT $${index++} OFFSET $${index++}
    `;
        params.push(pagination.size, offset);
        const [data, count] = await Promise.all([
            (0, db_1.query)(dataQuery, params),
            (0, db_1.query)(`SELECT COUNT(*) ${baseQuery}`, params.slice(0, -2)),
        ]);
        const total = Number(count.rows[0]?.count ?? 0);
        return (0, pagination_1.buildPaginationResult)(data.rows.map(mapLeaveRequest), pagination, total);
    }
    async getLeaveRequestById(requestId) {
        const result = await (0, db_1.query)(`
      SELECT
        lr.request_id,
        lr.user_id,
        u.email AS user_email,
        u.display_name AS user_name,
        lr.policy_id,
        lp.name AS policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        lr.half_day,
        lr.reason,
        lr.graph_event_id,
        lr.created_at,
        lr.updated_at,
        CASE
          WHEN lr.half_day THEN 0.5
          ELSE (lr.end_date - lr.start_date) + 1
        END AS days_requested
      FROM leave_requests lr
      INNER JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      INNER JOIN app_users u ON lr.user_id = u.id
      WHERE lr.request_id = $1
      `, [requestId]);
        if (result.rowCount === 0) {
            return null;
        }
        return mapLeaveRequest(result.rows[0]);
    }
    async insertLeaveRequest(client, params) {
        const result = await client.query(`
      INSERT INTO leave_requests (user_id, policy_id, start_date, end_date, half_day, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING request_id
      `, [params.userId, params.policyId, params.startDate, params.endDate, params.halfDay, params.reason ?? null]);
        const requestId = result.rows[0].request_id;
        const full = await client.query(`
      SELECT
        lr.request_id,
        lr.user_id,
        u.email AS user_email,
        u.display_name AS user_name,
        lr.policy_id,
        lp.name AS policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        lr.half_day,
        lr.reason,
        lr.graph_event_id,
        lr.created_at,
        lr.updated_at,
        CASE
          WHEN lr.half_day THEN 0.5
          ELSE (lr.end_date - lr.start_date) + 1
        END AS days_requested
      FROM leave_requests lr
      INNER JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      INNER JOIN app_users u ON lr.user_id = u.id
      WHERE lr.request_id = $1
      `, [requestId]);
        return mapLeaveRequest(full.rows[0]);
    }
    async updateLeaveRequestStatus(client, requestId, status, actorId, notes) {
        const result = await client.query(`
      UPDATE leave_requests
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      RETURNING request_id
      `, [status, requestId]);
        if (result.rowCount === 0) {
            throw new Error('Leave request not found');
        }
        await client.query(`
      INSERT INTO leave_audit (request_id, action, actor_id, notes)
      VALUES ($1, $2, $3, $4)
      `, [requestId, status, actorId, notes ?? null]);
        const updated = await client.query(`
      SELECT
        lr.request_id,
        lr.user_id,
        u.email AS user_email,
        u.display_name AS user_name,
        lr.policy_id,
        lp.name AS policy_name,
        lr.status,
        lr.start_date,
        lr.end_date,
        lr.half_day,
        lr.reason,
        lr.graph_event_id,
        lr.created_at,
        lr.updated_at,
        CASE
          WHEN lr.half_day THEN 0.5
          ELSE (lr.end_date - lr.start_date) + 1
        END AS days_requested
      FROM leave_requests lr
      INNER JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      INNER JOIN app_users u ON lr.user_id = u.id
      WHERE lr.request_id = $1
      `, [requestId]);
        return mapLeaveRequest(updated.rows[0]);
    }
    async adjustLeaveBalance(client, userId, policyId, year, days) {
        await client.query(`
      INSERT INTO leave_balances (user_id, policy_id, balance_days, year)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (user_id, policy_id, year) DO NOTHING
      `, [userId, policyId, year]);
        await client.query(`
      UPDATE leave_balances
      SET balance_days = balance_days - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND policy_id = $3 AND year = $4
      `, [days, userId, policyId, year]);
    }
    async restoreLeaveBalance(client, userId, policyId, year, days) {
        await client.query(`
      UPDATE leave_balances
      SET balance_days = balance_days + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND policy_id = $3 AND year = $4
      `, [days, userId, policyId, year]);
    }
    async hasOverlappingRequest(userId, policyId, startDate, endDate, excludeRequestId) {
        const params = [userId, policyId, startDate, endDate];
        let index = params.length + 1;
        let overlapQuery = `
      SELECT COUNT(*)::INT AS count
      FROM leave_requests
      WHERE user_id = $1
        AND policy_id = $2
        AND status IN ('PENDING', 'APPROVED')
        AND start_date <= $4
        AND end_date >= $3
    `;
        if (excludeRequestId) {
            overlapQuery += ` AND request_id <> $${index++}`;
            params.push(excludeRequestId);
        }
        const result = await (0, db_1.query)(overlapQuery, params);
        return result.rows[0].count > 0;
    }
    createLeaveRequest(params) {
        return (0, db_1.withTransaction)((client) => this.insertLeaveRequest(client, params));
    }
    async transitionLeaveRequest(params) {
        return (0, db_1.withTransaction)(async (client) => {
            const existingResult = await client.query(`
        SELECT
          lr.request_id,
          lr.user_id,
          u.email AS user_email,
          u.display_name AS user_name,
          lr.policy_id,
          (SELECT name FROM leave_policies WHERE policy_id = lr.policy_id) AS policy_name,
          lr.status,
          lr.start_date,
          lr.end_date,
          lr.half_day,
          lr.reason,
          lr.graph_event_id,
          lr.created_at,
          lr.updated_at,
          CASE
            WHEN lr.half_day THEN 0.5
            ELSE (lr.end_date - lr.start_date) + 1
          END AS days_requested
        FROM leave_requests lr
        INNER JOIN app_users u ON lr.user_id = u.id
        WHERE lr.request_id = $1
        FOR UPDATE
        `, [params.requestId]);
            if (existingResult.rowCount === 0) {
                throw new Error('Leave request not found');
            }
            const updated = await this.updateLeaveRequestStatus(client, params.requestId, params.newStatus, params.actorId, params.notes);
            const requestYear = new Date(updated.startDate).getFullYear();
            if (params.daysToAdjust && params.daysToAdjust > 0) {
                if (params.newStatus === 'APPROVED') {
                    await this.adjustLeaveBalance(client, updated.userId, updated.policyId, requestYear, params.daysToAdjust);
                }
                else if (params.newStatus === 'CANCELLED' || params.newStatus === 'REJECTED') {
                    await this.restoreLeaveBalance(client, updated.userId, updated.policyId, requestYear, params.daysToAdjust);
                }
            }
            return updated;
        });
    }
    async updateGraphEventId(requestId, graphEventId) {
        await (0, db_1.query)(`
      UPDATE leave_requests
      SET graph_event_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      `, [graphEventId, requestId]);
    }
}
exports.LeaveRepository = LeaveRepository;
//# sourceMappingURL=leaveRepository.js.map