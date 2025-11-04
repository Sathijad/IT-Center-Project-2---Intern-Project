import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { ReportsController } from '../controllers/reports.controller';

const router = Router();
const controller = new ReportsController();

// All routes require authentication and admin role
router.use(authenticateToken as RequestHandler);
router.use(requireAdmin as RequestHandler);

// Leave summary report
router.get('/leave-summary', controller.getLeaveSummary.bind(controller) as RequestHandler);

export default router;

