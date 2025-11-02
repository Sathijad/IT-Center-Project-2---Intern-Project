import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { enforceOwnData } from '../middleware/rbac.middleware';
import { LeaveController } from '../controllers/leave.controller';

const router = Router();
const controller = new LeaveController();

// All routes require authentication
router.use(authenticateToken);
router.use(idempotencyMiddleware);

// Get leave balance (EMPLOYEE: own, ADMIN: any)
router.get('/balance', enforceOwnData, controller.getBalance.bind(controller));

// List leave requests (EMPLOYEE: own, ADMIN: all with filters)
router.get('/requests', controller.getRequests.bind(controller));

// Create leave request
router.post('/requests', controller.createRequest.bind(controller));

// Update leave request status (approve/reject) - ADMIN only
router.patch('/requests/:id', controller.updateRequestStatus.bind(controller));

// Cancel leave request
router.patch('/requests/:id/cancel', controller.cancelRequest.bind(controller));

export default router;

