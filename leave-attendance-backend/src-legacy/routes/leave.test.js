import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { leaveRouter } from './leave.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { LeaveService } from '../services/leaveService.js';

jest.mock('../middleware/auth.js');
jest.mock('../services/leaveService.js');

describe('Leave Routes', () => {
  let app;
  let mockLeaveService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockLeaveService = {
      getLeaveBalance: jest.fn(),
      getLeaveRequests: jest.fn(),
      getLeaveRequestById: jest.fn(),
      createLeaveRequest: jest.fn(),
      updateLeaveRequestStatus: jest.fn(),
    };

    LeaveService.mockImplementation(() => mockLeaveService);
    
    // Mock authentication middleware
    authenticate.mockImplementation((req, res, next) => {
      req.user = {
        userId: 123,
        roles: ['EMPLOYEE'],
        cognitoSub: 'test-sub'
      };
      next();
    });

    app.use('/api/v1/leave', leaveRouter);
  });

  describe('GET /api/v1/leave/balance', () => {
    it('should return leave balance for current user', async () => {
      const mockBalance = {
        user_id: 123,
        balances: [
          { policy_id: 1, policy_name: 'Annual Leave', balance_days: 12.5, year: 2025 }
        ]
      };

      mockLeaveService.getLeaveBalance.mockResolvedValue(mockBalance);

      const response = await request(app)
        .get('/api/v1/leave/balance')
        .expect(200);

      expect(response.body).toEqual(mockBalance);
      expect(mockLeaveService.getLeaveBalance).toHaveBeenCalledWith(123, expect.any(Number));
    });

    it('should allow admin to view other user balance', async () => {
      authenticate.mockImplementationOnce((req, res, next) => {
        req.user = {
          userId: 456,
          roles: ['ADMIN'],
          cognitoSub: 'admin-sub'
        };
        next();
      });

      const mockBalance = {
        user_id: 123,
        balances: []
      };

      mockLeaveService.getLeaveBalance.mockResolvedValue(mockBalance);

      await request(app)
        .get('/api/v1/leave/balance?user_id=123')
        .expect(200);

      expect(mockLeaveService.getLeaveBalance).toHaveBeenCalledWith(123, expect.any(Number));
    });
  });

  describe('GET /api/v1/leave/requests', () => {
    it('should return paginated leave requests', async () => {
      const mockRequests = {
        content: [
          {
            request_id: 1,
            user_id: 123,
            status: 'PENDING',
            start_date: '2025-01-15',
            end_date: '2025-01-20'
          }
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20
      };

      mockLeaveService.getLeaveRequests.mockResolvedValue(mockRequests);

      const response = await request(app)
        .get('/api/v1/leave/requests')
        .expect(200);

      expect(response.body).toEqual(mockRequests);
    });

    it('should filter by status', async () => {
      mockLeaveService.getLeaveRequests.mockResolvedValue({ content: [], totalElements: 0 });

      await request(app)
        .get('/api/v1/leave/requests?status=PENDING')
        .expect(200);

      expect(mockLeaveService.getLeaveRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' })
      );
    });
  });

  describe('POST /api/v1/leave/requests', () => {
    it('should create leave request', async () => {
      authorize.mockImplementationOnce((...roles) => (req, res, next) => next());

      const mockRequest = {
        request_id: 1,
        user_id: 123,
        policy_id: 1,
        start_date: '2025-01-15',
        end_date: '2025-01-20',
        status: 'PENDING'
      };

      mockLeaveService.createLeaveRequest.mockResolvedValue(mockRequest);

      const response = await request(app)
        .post('/api/v1/leave/requests')
        .send({
          policy_id: 1,
          start_date: '2025-01-15',
          end_date: '2025-01-20',
          reason: 'Vacation'
        })
        .expect(201);

      expect(response.body).toEqual(mockRequest);
      expect(mockLeaveService.createLeaveRequest).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          policy_id: 1,
          start_date: '2025-01-15',
          end_date: '2025-01-20'
        })
      );
    });

    it('should validate date range', async () => {
      authorize.mockImplementationOnce((...roles) => (req, res, next) => next());

      await request(app)
        .post('/api/v1/leave/requests')
        .send({
          policy_id: 1,
          start_date: '2025-01-20',
          end_date: '2025-01-15' // Invalid: end before start
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/leave/requests/:id', () => {
    it('should allow admin to approve request', async () => {
      authenticate.mockImplementationOnce((req, res, next) => {
        req.user = {
          userId: 456,
          roles: ['ADMIN'],
          cognitoSub: 'admin-sub'
        };
        next();
      });

      const mockRequest = {
        request_id: 1,
        status: 'APPROVED'
      };

      mockLeaveService.updateLeaveRequestStatus.mockResolvedValue(mockRequest);

      await request(app)
        .patch('/api/v1/leave/requests/1')
        .send({ action: 'APPROVE' })
        .expect(200);

      expect(mockLeaveService.updateLeaveRequestStatus).toHaveBeenCalledWith(
        1,
        'APPROVE',
        456,
        undefined
      );
    });

    it('should prevent non-admin from approving', async () => {
      authorize.mockImplementationOnce((...roles) => (req, res, next) => {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      });

      await request(app)
        .patch('/api/v1/leave/requests/1')
        .send({ action: 'APPROVE' })
        .expect(403);
    });
  });
});

