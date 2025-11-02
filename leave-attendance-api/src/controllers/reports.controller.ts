import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, sendErrorResponse } from '../lib/errors';
import { query } from '../lib/db';

export class ReportsController {
  async getLeaveSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Only ADMIN can access reports
      if (!req.user!.isAdmin) {
        return sendErrorResponse(res, new ForbiddenError('Admin access required'));
      }

      const fromDate = req.query.from 
        ? new Date(req.query.from as string)
        : new Date(new Date().getFullYear(), 0, 1); // Start of year

      const toDate = req.query.to 
        ? new Date(req.query.to as string)
        : new Date();

      // Get leave summary by status and policy
      const summary = await query(
        `SELECT 
          lp.type as policy_type,
          lr.status,
          COUNT(*) as request_count,
          SUM(CASE 
            WHEN lr.half_day IS NOT NULL AND (lr.end_date - lr.start_date) = 0 THEN 0.5
            WHEN lr.half_day IS NOT NULL THEN (lr.end_date - lr.start_date) + 0.5
            ELSE (lr.end_date - lr.start_date) + 1
          END) as total_days
        FROM leave_requests lr
        JOIN leave_policies lp ON lr.policy_id = lp.id
        WHERE lr.start_date >= $1 AND lr.end_date <= $2
        GROUP BY lp.type, lr.status
        ORDER BY lp.type, lr.status`,
        [fromDate, toDate]
      );

      // Get user-level summary
      const userSummary = await query(
        `SELECT 
          u.id as user_id,
          u.display_name,
          u.email,
          lp.type as policy_type,
          COALESCE(lb.balance_days, 0) as balance,
          COUNT(lr.id) FILTER (WHERE lr.status = 'APPROVED') as approved_requests,
          SUM(CASE 
            WHEN lr.status = 'APPROVED' AND lr.half_day IS NOT NULL AND (lr.end_date - lr.start_date) = 0 THEN 0.5
            WHEN lr.status = 'APPROVED' AND lr.half_day IS NOT NULL THEN (lr.end_date - lr.start_date) + 0.5
            WHEN lr.status = 'APPROVED' THEN (lr.end_date - lr.start_date) + 1
            ELSE 0
          END) as used_days
        FROM app_users u
        CROSS JOIN leave_policies lp
        LEFT JOIN leave_balances lb ON u.id = lb.user_id AND lp.id = lb.policy_id
        LEFT JOIN leave_requests lr ON u.id = lr.user_id AND lp.id = lr.policy_id
          AND lr.start_date >= $1 AND lr.end_date <= $2
        WHERE u.is_active = true
        GROUP BY u.id, u.display_name, u.email, lp.type, lb.balance_days
        ORDER BY u.display_name, lp.type`,
        [fromDate, toDate]
      );

      res.json({
        data: {
          period: {
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
          },
          summaryByPolicy: summary,
          summaryByUser: userSummary,
        },
      });
    } catch (error) {
      sendErrorResponse(res, error as Error);
    }
  }
}

