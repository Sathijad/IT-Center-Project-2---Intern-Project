import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { enforceOwnData } from '../middleware/rbac.middleware';
import { AttendanceController } from '../controllers/attendance.controller';

const router = Router();
const controller = new AttendanceController();

// All routes require authentication
router.use(authenticateToken as RequestHandler);
router.use(idempotencyMiddleware as RequestHandler);

// Clock in
router.post('/clock-in', controller.clockIn.bind(controller) as RequestHandler);

// Clock out
router.post('/clock-out', controller.clockOut.bind(controller) as RequestHandler);

// Get today's attendance status
router.get('/today', controller.getTodayStatus.bind(controller) as RequestHandler);

// Get attendance logs (EMPLOYEE: own, ADMIN: all with filters)
router.get('/', enforceOwnData as RequestHandler, controller.getAttendance.bind(controller) as RequestHandler);

export default router;

