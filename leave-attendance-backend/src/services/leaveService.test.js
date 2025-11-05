import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LeaveService } from './leaveService.js';
import { LeaveRepository } from '../repositories/leaveRepository.js';

jest.mock('../repositories/leaveRepository.js');

describe('LeaveService', () => {
  let leaveService;
  let mockLeaveRepo;

  beforeEach(() => {
    mockLeaveRepo = {
      getLeaveBalance: jest.fn(),
      getLeaveRequests: jest.fn(),
      getLeaveRequestById: jest.fn(),
      createLeaveRequest: jest.fn(),
      checkOverlappingLeaves: jest.fn(),
      updateLeaveRequestStatus: jest.fn(),
      deductLeaveBalance: jest.fn(),
      auditLeaveAction: jest.fn(),
    };
    
    LeaveRepository.mockImplementation(() => mockLeaveRepo);
    leaveService = new LeaveService();
  });

  describe('getLeaveBalance', () => {
    it('should return formatted leave balances', async () => {
      const mockBalances = [
        { balance_id: 1, policy_id: 1, policy_name: 'Annual Leave', balance_days: 12.5, year: 2025 },
        { balance_id: 2, policy_id: 2, policy_name: 'Casual Leave', balance_days: 5, year: 2025 },
      ];

      mockLeaveRepo.getLeaveBalance.mockResolvedValue(mockBalances);

      const result = await leaveService.getLeaveBalance(123, 2025);

      expect(result).toEqual({
        user_id: 123,
        balances: [
          { balance_id: 1, policy_id: 1, policy_name: 'Annual Leave', balance_days: 12.5, year: 2025 },
          { balance_id: 2, policy_id: 2, policy_name: 'Casual Leave', balance_days: 5, year: 2025 },
        ],
      });
    });
  });

  describe('createLeaveRequest', () => {
    it('should create leave request when no overlap exists', async () => {
      mockLeaveRepo.checkOverlappingLeaves.mockResolvedValue(true);
      mockLeaveRepo.createLeaveRequest.mockResolvedValue({ request_id: 1 });

      const result = await leaveService.createLeaveRequest(123, {
        policy_id: 1,
        start_date: '2025-01-15',
        end_date: '2025-01-20',
        reason: 'Vacation',
      });

      expect(mockLeaveRepo.checkOverlappingLeaves).toHaveBeenCalledWith(
        123,
        '2025-01-15',
        '2025-01-20'
      );
      expect(result).toEqual({ request_id: 1 });
    });

    it('should throw error when overlapping leave exists', async () => {
      mockLeaveRepo.checkOverlappingLeaves.mockResolvedValue(false);

      await expect(
        leaveService.createLeaveRequest(123, {
          policy_id: 1,
          start_date: '2025-01-15',
          end_date: '2025-01-20',
        })
      ).rejects.toThrow('Overlapping leave request exists');
    });
  });

  describe('updateLeaveRequestStatus', () => {
    it('should deduct balance when approving pending request', async () => {
      const mockRequest = {
        request_id: 1,
        user_id: 123,
        policy_id: 1,
        start_date: '2025-01-15',
        end_date: '2025-01-20',
        status: 'PENDING',
      };

      mockLeaveRepo.getLeaveRequestById.mockResolvedValue(mockRequest);
      mockLeaveRepo.updateLeaveRequestStatus.mockResolvedValue({ ...mockRequest, status: 'APPROVED' });

      const result = await leaveService.updateLeaveRequestStatus(1, 'APPROVE', 456);

      expect(mockLeaveRepo.deductLeaveBalance).toHaveBeenCalledWith(123, 1, 6, 2025);
      expect(result.status).toBe('APPROVED');
    });

    it('should not deduct balance when rejecting', async () => {
      const mockRequest = {
        request_id: 1,
        status: 'PENDING',
      };

      mockLeaveRepo.getLeaveRequestById.mockResolvedValue(mockRequest);
      mockLeaveRepo.updateLeaveRequestStatus.mockResolvedValue({ ...mockRequest, status: 'REJECTED' });

      await leaveService.updateLeaveRequestStatus(1, 'REJECT', 456);

      expect(mockLeaveRepo.deductLeaveBalance).not.toHaveBeenCalled();
    });
  });
});

