import { LeaveRepository } from '../repositories/leaveRepository.js';
import { calculateLeaveDays } from '../utils/dateUtils.js';

export class LeaveService {
  constructor() {
    this.leaveRepo = new LeaveRepository();
  }

  async getLeaveBalance(userId, year = new Date().getFullYear()) {
    const balances = await this.leaveRepo.getLeaveBalance(userId, year);
    return {
      user_id: userId,
      balances: balances.map(b => ({
        balance_id: b.balance_id,
        policy_id: b.policy_id,
        policy_name: b.policy_name,
        balance_days: parseFloat(b.balance_days),
        year: b.year
      }))
    };
  }

  async getLeaveRequests(filters) {
    return await this.leaveRepo.getLeaveRequests(filters);
  }

  async getLeaveRequestById(requestId) {
    const request = await this.leaveRepo.getLeaveRequestById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }
    return request;
  }

  async createLeaveRequest(userId, data) {
    // Check for overlapping approved leaves
    const hasOverlap = await this.leaveRepo.checkOverlappingLeaves(
      userId,
      data.start_date,
      data.end_date
    );

    if (!hasOverlap) {
      const error = new Error('Overlapping leave request exists');
      error.code = 'OVERLAPPING_LEAVE';
      error.statusCode = 409;
      throw error;
    }

    return await this.leaveRepo.createLeaveRequest(
      userId,
      data.policy_id,
      data.start_date,
      data.end_date,
      data.reason
    );
  }

  async updateLeaveRequestStatus(requestId, action, actorId, notes) {
    const request = await this.leaveRepo.getLeaveRequestById(requestId);
    if (!request) {
      const error = new Error('Leave request not found');
      error.statusCode = 404;
      throw error;
    }

    const statusMap = {
      'APPROVE': 'APPROVED',
      'REJECT': 'REJECTED',
      'CANCEL': 'CANCELLED'
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      const error = new Error('Invalid action');
      error.statusCode = 400;
      throw error;
    }

    // Only deduct balance on approval
    if (action === 'APPROVE' && request.status === 'PENDING') {
      const days = calculateLeaveDays(request.start_date, request.end_date);
      const year = new Date(request.start_date).getFullYear();
      
      await this.leaveRepo.deductLeaveBalance(
        request.user_id,
        request.policy_id,
        days,
        year
      );
    }

    return await this.leaveRepo.updateLeaveRequestStatus(
      requestId,
      newStatus,
      actorId,
      notes
    );
  }

  async getLeavePolicies() {
    return await this.leaveRepo.getLeavePolicies();
  }
}

