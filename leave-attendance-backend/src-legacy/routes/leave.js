import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, createLeaveRequestSchema, updateLeaveRequestSchema, paginationSchema } from '../utils/validation.js';
import { LeaveService } from '../services/leaveService.js';

export const leaveRouter = express.Router();
const leaveService = new LeaveService();

// Get leave policies
leaveRouter.get('/policies',
  authenticate,
  async (req, res, next) => {
    try {
      const policies = await leaveService.getLeavePolicies();
      res.json(policies);
    } catch (error) {
      next(error);
    }
  }
);

// Get leave balance
leaveRouter.get('/balance',
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user.userId) {
        return res.status(400).json({
          code: 'INVALID_USER',
          message: 'User not found in database',
          traceId: req.traceId
        });
      }

      const userId = req.query.user_id && req.user.roles?.includes('ADMIN')
        ? parseInt(req.query.user_id)
        : req.user.userId;

      const year = parseInt(req.query.year) || new Date().getFullYear();
      const balance = await leaveService.getLeaveBalance(userId, year);
      res.json(balance);
    } catch (error) {
      next(error);
    }
  }
);

// List leave requests
leaveRouter.get('/requests',
  authenticate,
  validate(paginationSchema),
  async (req, res, next) => {
    try {
      if (!req.user.userId) {
        return res.status(400).json({
          code: 'INVALID_USER',
          message: 'User not found in database',
          traceId: req.traceId
        });
      }

      // For admins: if user_id is provided, filter by that user; otherwise show all requests
      // For regular users: always filter by their own userId
      let userId;
      if (req.user.roles?.includes('ADMIN')) {
        userId = req.query.user_id ? parseInt(req.query.user_id) : undefined;
      } else {
        userId = req.user.userId;
      }

      const filters = {
        userId: userId,
        status: req.query.status,
        startDate: req.query.start_date,
        endDate: req.query.end_date,
        page: req.query.page,
        size: req.query.size,
        sort: req.query.sort
      };

      const result = await leaveService.getLeaveRequests(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get leave request by ID
leaveRouter.get('/requests/:id',
  authenticate,
  async (req, res) => {
    const requestId = parseInt(req.params.id);
    const request = await leaveService.getLeaveRequestById(requestId);

    // Check authorization - users can only view their own requests unless admin
    if (!req.user.roles?.includes('ADMIN') && request.user_id !== req.user.userId) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        traceId: req.traceId
      });
    }

    res.json(request);
  }
);

// Create leave request
leaveRouter.post('/requests',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN'),
  validate(createLeaveRequestSchema),
  async (req, res) => {
    const request = await leaveService.createLeaveRequest(req.user.userId, req.body);
    res.status(201).json(request);
  }
);

// Update leave request status (Approve/Reject/Cancel)
leaveRouter.patch('/requests/:id',
  authenticate,
  validate(updateLeaveRequestSchema),
  async (req, res) => {
    const requestId = parseInt(req.params.id);
    const { action, notes } = req.body;

    // Only admins can approve/reject, users can cancel their own
    if ((action === 'APPROVE' || action === 'REJECT') && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only admins can approve or reject leave requests',
        traceId: req.traceId
      });
    }

    const request = await leaveService.updateLeaveRequestStatus(
      requestId,
      action,
      req.user.userId,
      notes
    );

    res.json(request);
  }
);

