import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../config/database.js';

export const reportsRouter = express.Router();

reportsRouter.get('/leave-summary',
  authenticate,
  authorize('ADMIN'),
  async (req, res) => {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;

    let query = `
      SELECT 
        u.id as user_id,
        u.display_name as user_name,
        u.email as user_email,
        lp.name as policy_name,
        lp.annual_limit as total_days,
        COALESCE(SUM(
          CASE 
            WHEN lr.status = 'APPROVED' 
            THEN (lr.end_date - lr.start_date + 1)
            ELSE 0
          END
        ), 0) as used_days
      FROM app_users u
      CROSS JOIN leave_policies lp
      LEFT JOIN leave_requests lr ON lr.user_id = u.id 
        AND lr.policy_id = lp.policy_id
        AND EXTRACT(YEAR FROM lr.start_date) = $1
        AND lr.status = 'APPROVED'
      WHERE u.is_active = true
    `;
    const params = [year];

    if (userId) {
      query += ` AND u.id = $2`;
      params.push(userId);
    }

    query += `
      GROUP BY u.id, u.display_name, u.email, lp.name, lp.annual_limit
      ORDER BY u.display_name, lp.name
    `;

    const result = await db.query(query, params);

    // Transform to report format
    const summary = {};
    result.rows.forEach(row => {
      if (!summary[row.user_id]) {
        summary[row.user_id] = {
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          policies: []
        };
      }
      summary[row.user_id].policies.push({
        policy_name: row.policy_name,
        total_days: parseFloat(row.total_days),
        used_days: parseFloat(row.used_days),
        remaining_days: parseFloat(row.total_days) - parseFloat(row.used_days)
      });
    });

    res.json({
      year,
      total_users: Object.keys(summary).length,
      summary: Object.values(summary)
    });
  }
);

