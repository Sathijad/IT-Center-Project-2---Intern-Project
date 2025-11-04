import { query, queryOne } from '../lib/db';
import { LeavePolicy, LeaveRequest, LeaveBalance, LeaveAudit } from '../types';

export class LeaveRepository {
  // Leave Policies
  async findAllPolicies(): Promise<LeavePolicy[]> {
    return query<LeavePolicy>(
      'SELECT * FROM leave_policies ORDER BY type'
    );
  }

  async findPolicyById(id: number): Promise<LeavePolicy | null> {
    return queryOne<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
  }

  async findPolicyByType(type: string): Promise<LeavePolicy | null> {
    return queryOne<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE type = $1',
      [type]
    );
  }

  // Leave Requests
  async createLeaveRequest(data: {
    userId: number;
    policyId: number;
    startDate: Date;
    endDate: Date;
    halfDay: 'AM' | 'PM' | null;
    reason: string | null;
  }): Promise<LeaveRequest> {
    const result = await query<LeaveRequest>(
      `INSERT INTO leave_requests (user_id, policy_id, start_date, end_date, half_day, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING *`,
      [data.userId, data.policyId, data.startDate, data.endDate, data.halfDay, data.reason]
    );
    return result[0];
  }

  async findLeaveRequestById(id: number): Promise<LeaveRequest | null> {
    return queryOne<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
  }

  async findLeaveRequestsByUserId(userId: number): Promise<LeaveRequest[]> {
    // Use COALESCE for safe balance retrieval
    return query<LeaveRequest & { balance_days?: number }>(
      `SELECT 
        r.*,
        COALESCE(b.balance_days, 0) AS balance_days
       FROM leave_requests r
       LEFT JOIN leave_balances b ON b.user_id = r.user_id AND b.policy_id = r.policy_id
       WHERE r.user_id = $1 
       ORDER BY r.created_at DESC`,
      [userId]
    );
  }

  async findAllLeaveRequests(filters: {
    userId?: number;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    size?: number;
  }): Promise<{ data: LeaveRequest[]; total: number }> {
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

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.fromDate) {
      whereClause += ` AND start_date >= $${paramIndex++}`;
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      whereClause += ` AND end_date <= $${paramIndex++}`;
      params.push(filters.toDate);
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM leave_requests ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].count, 10);

    // Get paginated data with COALESCE for safe balance retrieval
    params.push(size, offset);
    const data = await query<LeaveRequest & { balance_days?: number }>(
      `SELECT 
        r.*,
        COALESCE(b.balance_days, 0) AS balance_days
       FROM leave_requests r
       LEFT JOIN leave_balances b ON b.user_id = r.user_id AND b.policy_id = r.policy_id
       ${whereClause} 
       ORDER BY r.created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return { data, total };
  }

  async updateLeaveRequestStatus(
    id: number,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    approvedBy: number | null,
    rejectionReason: string | null
  ): Promise<LeaveRequest | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    updates.push(`status = $${paramIndex++}`);
    params.push(status);

    if (status === 'APPROVED') {
      updates.push(`approved_by = $${paramIndex++}`);
      params.push(approvedBy);
      updates.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'REJECTED' && rejectionReason) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      params.push(rejectionReason);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query<LeaveRequest>(
      `UPDATE leave_requests 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      params
    );

    return result[0] || null;
  }

  async checkOverlappingLeave(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: number
  ): Promise<LeaveRequest[]> {
    let queryText = `
      SELECT * FROM leave_requests
      WHERE user_id = $1
        AND status IN ('PENDING', 'APPROVED')
        AND daterange(start_date, end_date, '[]') && daterange($2, $3, '[]')
    `;
    const params: unknown[] = [userId, startDate, endDate];

    if (excludeRequestId) {
      queryText += ` AND id != $4`;
      params.push(excludeRequestId);
    }

    return query<LeaveRequest>(queryText, params);
  }

  // Leave Balances
  async findBalanceByUserAndPolicy(
    userId: number,
    policyId: number
  ): Promise<LeaveBalance | null> {
    return queryOne<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE user_id = $1 AND policy_id = $2',
      [userId, policyId]
    );
  }

  async findBalancesByUserId(userId: number): Promise<LeaveBalance[]> {
    return query<LeaveBalance>(
      `SELECT lb.*, lp.type as policy_type 
       FROM leave_balances lb
       JOIN leave_policies lp ON lb.policy_id = lp.id
       WHERE lb.user_id = $1`,
      [userId]
    );
  }

  // UPSERT balance - robust version that never inserts NULL and never goes negative
  // Returns the new balance_days value
  async upsertBalance(
    userId: number,
    policyId: number,
    deltaDays: number
  ): Promise<number> {
    const safeDeltaDays = Number.isFinite(deltaDays) ? deltaDays : 0;
    
    const result = await query<{ balance_days: number }>(
      `INSERT INTO leave_balances (user_id, policy_id, balance_days)
       VALUES ($1, $2, GREATEST(0, $3))
       ON CONFLICT (user_id, policy_id)
       DO UPDATE SET 
         balance_days = GREATEST(0, COALESCE(leave_balances.balance_days, 0) + EXCLUDED.balance_days),
         updated_at = CURRENT_TIMESTAMP
       RETURNING balance_days`,
      [userId, policyId, safeDeltaDays]
    );
    return Number(result[0]?.balance_days || 0);
  }

  // Legacy method for backward compatibility (uses upsertBalance internally)
  async upsertBalanceLegacy(
    userId: number,
    policyId: number,
    balanceDays: number
  ): Promise<LeaveBalance> {
    await this.upsertBalance(userId, policyId, balanceDays);
    const balance = await this.findBalanceByUserAndPolicy(userId, policyId);
    if (!balance) {
      throw new Error('Failed to retrieve balance after upsert');
    }
    return balance;
  }

  async updateBalance(
    userId: number,
    policyId: number,
    deltaDays: number
  ): Promise<LeaveBalance | null> {
    // Ensure deltaDays is a valid number
    const safeDeltaDays = Number.isFinite(deltaDays) ? deltaDays : 0;
    
    const result = await query<LeaveBalance>(
      `UPDATE leave_balances
       SET balance_days = GREATEST(0, COALESCE(balance_days, 0) + $3), updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND policy_id = $2
       RETURNING *`,
      [userId, policyId, safeDeltaDays]
    );
    return result[0] || null;
  }

  // Leave Audit
  async createAuditLog(
    requestId: number,
    action: string,
    actorId: number,
    notes: string | null
  ): Promise<LeaveAudit> {
    const result = await query<LeaveAudit>(
      `INSERT INTO leave_audit (request_id, action, actor_id, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [requestId, action, actorId, notes]
    );
    return result[0];
  }

  async findAuditLogsByRequestId(requestId: number): Promise<LeaveAudit[]> {
    return query<LeaveAudit>(
      'SELECT * FROM leave_audit WHERE request_id = $1 ORDER BY created_at ASC',
      [requestId]
    );
  }

  // List policies with simplified structure for initialization
  async listPoliciesForInit(): Promise<Array<{id: number; maxDays: number; accrualRate: number; accrualPeriod: string}>> {
    const policies = await this.findAllPolicies();
    return policies.map(p => ({
      id: p.id,
      maxDays: p.maxDays,
      accrualRate: p.accrualRate,
      accrualPeriod: p.accrualPeriod
    }));
  }

  // Initialize balances for a new user
  // This should be called when a user is created
  async initializeUserBalances(userId: number, hireDate?: Date): Promise<LeaveBalance[]> {
    const policies = await this.listPoliciesForInit();

    // Use FULL allocation by default (set to false for prorated)
    const full = true;

    // Calculate months worked (for prorated allocation)
    let months = 12;
    if (!full && hireDate) {
      const now = new Date();
      const diffMs = now.getTime() - hireDate.getTime();
      months = Math.max(0, Math.min(12, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))));
    } else if (!full) {
      // Fall back to created_at if no hireDate
      const userResult = await queryOne<{ created_at: string | Date }>(
        'SELECT created_at FROM app_users WHERE id = $1',
        [userId]
      );
      if (userResult?.created_at) {
        const createdDate = new Date(userResult.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        months = Math.max(0, Math.min(12, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))));
      }
    }

    const balances: LeaveBalance[] = [];

    // Initialize balance for each policy
    for (const p of policies) {
      // Calculate per month accrual rate
      const perMonth = p.accrualRate > 0 
        ? p.accrualRate 
        : (p.maxDays / 12.0);
      
      // Calculate starting balance
      const start = full 
        ? p.maxDays 
        : Math.round(Math.max(0, months * perMonth) * 100) / 100;

      // Upsert the balance (delta approach)
      await this.upsertBalance(userId, p.id, start);
      
      // Retrieve the created balance
      const balance = await this.findBalanceByUserAndPolicy(userId, p.id);
      if (balance) {
        balances.push(balance);
      }
    }

    return balances;
  }
}

