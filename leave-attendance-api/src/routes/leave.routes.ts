import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { enforceOwnData } from '../middleware/rbac.middleware';
import { LeaveController } from '../controllers/leave.controller';

const router = Router();
const controller = new LeaveController();

// All routes require authentication
router.use(authenticateToken as RequestHandler);
router.use(idempotencyMiddleware as RequestHandler);

// Get leave balance (EMPLOYEE: own, ADMIN: any)
router.get('/balance', enforceOwnData as RequestHandler, controller.getBalance.bind(controller) as RequestHandler);

// List leave requests (EMPLOYEE: own, ADMIN: all with filters)
router.get('/requests', controller.getRequests.bind(controller) as RequestHandler);

// Create leave request
router.post('/requests', controller.createRequest.bind(controller) as RequestHandler);

// Update leave request status (approve/reject) - ADMIN only
router.patch('/requests/:id', controller.updateRequestStatus.bind(controller) as RequestHandler);

// Cancel leave request
router.patch('/requests/:id/cancel', controller.cancelRequest.bind(controller) as RequestHandler);

export default router;

