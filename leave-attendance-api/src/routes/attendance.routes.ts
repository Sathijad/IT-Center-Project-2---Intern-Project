import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { enforceOwnData } from '../middleware/rbac.middleware';
import { AttendanceController } from '../controllers/attendance.controller';

const router = Router();
const controller = new AttendanceController();

// All routes require authentication
router.use(authenticateToken);
router.use(idempotencyMiddleware);

// Clock in
router.post('/clock-in', controller.clockIn.bind(controller));

// Clock out
router.post('/clock-out', controller.clockOut.bind(controller));

// Get today's attendance status
router.get('/today', controller.getTodayStatus.bind(controller));

// Get attendance logs (EMPLOYEE: own, ADMIN: all with filters)
router.get('/', enforceOwnData, controller.getAttendance.bind(controller));

export default router;

