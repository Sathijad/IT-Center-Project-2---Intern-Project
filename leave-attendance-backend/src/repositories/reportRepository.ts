import { query } from '../common/db';

export interface LeaveSummaryFilters {
  from?: string;
  to?: string;
  teamId?: number;
}

export interface LeavePolicySummary {
  policyId: number;
  policyName: string;
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  approvedDays: number;
}

export interface LeaveSummaryTotals {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  approvedDays: number;
}

export interface LeaveSummaryResult {
  range: {
    from?: string;
    to?: string;
  };
  policies: LeavePolicySummary[];
  totals: LeaveSummaryTotals;
}

export class ReportRepository {
  async getLeaveSummary(filters: LeaveSummaryFilters): Promise<LeaveSummaryResult> {
    const params: unknown[] = [];
    let index = 1;

    let whereClause = 'WHERE 1=1';

    if (filters.from) {
      whereClause += ` AND lr.start_date >= $${index++}`;
      params.push(filters.from);
    }

    if (filters.to) {
      whereClause += ` AND lr.end_date <= $${index++}`;
      params.push(filters.to);
    }

    if (filters.teamId) {
      whereClause += ` AND lr.user_team_id = $${index++}`;
      params.push(filters.teamId);
    }

    const policyQuery = `
      SELECT
        lp.policy_id,
        lp.name AS policy_name,
        COUNT(*)::INT AS total_requests,
        SUM(CASE WHEN lr.status = 'PENDING' THEN 1 ELSE 0 END)::INT AS pending,
        SUM(CASE WHEN lr.status = 'APPROVED' THEN 1 ELSE 0 END)::INT AS approved,
        SUM(CASE WHEN lr.status = 'REJECTED' THEN 1 ELSE 0 END)::INT AS rejected,
        SUM(CASE WHEN lr.status = 'CANCELLED' THEN 1 ELSE 0 END)::INT AS cancelled,
        SUM(
          CASE WHEN lr.status = 'APPROVED'
            THEN CASE WHEN lr.half_day THEN 0.5 ELSE (lr.end_date - lr.start_date) + 1 END
            ELSE 0
          END
        )::FLOAT AS approved_days
      FROM leave_requests lr
      INNER JOIN leave_policies lp ON lr.policy_id = lp.policy_id
      ${whereClause}
      GROUP BY lp.policy_id, lp.name
      ORDER BY lp.name ASC
    `;

    const policyResult = await query<{
      policy_id: number;
      policy_name: string;
      total_requests: number;
      pending: number;
      approved: number;
      rejected: number;
      cancelled: number;
      approved_days: number;
    }>(policyQuery, params);

    const policies: LeavePolicySummary[] = policyResult.rows.map((row) => ({
      policyId: row.policy_id,
      policyName: row.policy_name,
      totalRequests: row.total_requests,
      pending: row.pending,
      approved: row.approved,
      rejected: row.rejected,
      cancelled: row.cancelled,
      approvedDays: row.approved_days,
    }));

    const totals = policies.reduce<LeaveSummaryTotals>(
      (acc, policy) => ({
        totalRequests: acc.totalRequests + policy.totalRequests,
        pending: acc.pending + policy.pending,
        approved: acc.approved + policy.approved,
        rejected: acc.rejected + policy.rejected,
        cancelled: acc.cancelled + policy.cancelled,
        approvedDays: acc.approvedDays + policy.approvedDays,
      }),
      {
        totalRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        approvedDays: 0,
      },
    );

    return {
      range: {
        from: filters.from,
        to: filters.to,
      },
      policies,
      totals,
    };
  }
}

