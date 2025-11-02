import { LeaveRepository } from '../repositories/leave.repository';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ERROR_CODES,
} from '../lib/errors';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequest } from '../types';
import { query } from '../lib/db';

export class LeaveService {
  private repository: LeaveRepository;

  constructor() {
    this.repository = new LeaveRepository();
  }

  async getLeaveBalance(userId: number): Promise<unknown[]> {
    const balances = await this.repository.findBalancesByUserId(userId);
    
    // Join with policy details
    return balances.map((balance) => ({
      policyId: balance.policyId,
      balanceDays: parseFloat(balance.balanceDays.toString()),
      updatedAt: balance.updatedAt,
    }));
  }

  async getLeaveRequests(filters: {
    userId?: number;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    size?: number;
  }): Promise<{ data: LeaveRequest[]; total: number }> {
    return this.repository.findAllLeaveRequests(filters);
  }

  async createLeaveRequest(
    userId: number,
    dto: CreateLeaveRequestDto
  ): Promise<LeaveRequest> {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (endDate < startDate) {
      throw new ValidationError('End date must be after start date', {
        code: ERROR_CODES.INVALID_DATE_RANGE,
      });
    }

    // Get policy
    const policy = await this.repository.findPolicyById(dto.policyId);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }

    // Check minimum notice period
    const daysUntilStart = Math.ceil(
      (startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilStart < policy.minNoticeDays) {
      throw new ValidationError(
        `Minimum notice period is ${policy.minNoticeDays} days`,
        { code: ERROR_CODES.MIN_NOTICE_PERIOD_NOT_MET }
      );
    }

    // Check for overlapping leave
    const overlapping = await this.repository.checkOverlappingLeave(
      userId,
      startDate,
      endDate
    );
    if (overlapping.length > 0) {
      throw new ConflictError(
        'Leave request overlaps with existing approved or pending leave',
        { code: ERROR_CODES.LEAVE_OVERLAP }
      );
    }

    // Calculate leave days
    const leaveDays = this.calculateLeaveDays(startDate, endDate, dto.halfDay);

    // Check balance
    let balance = await this.repository.findBalanceByUserAndPolicy(userId, dto.policyId);
    if (!balance) {
      // Initialize balance (could be based on accrual, for now set to policy max)
      await this.repository.upsertBalance(userId, dto.policyId, policy.maxDays);
      balance = await this.repository.findBalanceByUserAndPolicy(userId, dto.policyId);
      if (!balance) {
        throw new Error('Failed to initialize leave balance');
      }
    }

    const currentBalance = parseFloat(balance.balanceDays.toString());
    if (currentBalance < leaveDays) {
      throw new ValidationError(
        `Insufficient leave balance. Available: ${currentBalance}, Requested: ${leaveDays}`,
        { code: ERROR_CODES.INSUFFICIENT_BALANCE }
      );
    }

    // Create request
    const request = await this.repository.createLeaveRequest({
      userId,
      policyId: dto.policyId,
      startDate,
      endDate,
      halfDay: dto.halfDay || null,
      reason: dto.reason || null,
    });

    // Create audit log
    await this.repository.createAuditLog(
      request.id,
      'CREATED',
      userId,
      `Leave request created for ${leaveDays} day(s)`
    );

    return request;
  }

  async updateLeaveRequestStatus(
    requestId: number,
    dto: UpdateLeaveRequestDto,
    actorId: number,
    isAdmin: boolean
  ): Promise<LeaveRequest> {
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can approve/reject leave requests');
    }

    const request = await this.repository.findLeaveRequestById(requestId);
    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ConflictError(`Cannot update leave request with status: ${request.status}`);
    }

    // Update status
    const updated = await this.repository.updateLeaveRequestStatus(
      requestId,
      dto.status,
      actorId,
      dto.rejectionReason || null
    );

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    // If approved, deduct balance
    if (dto.status === 'APPROVED') {
      const leaveDays = this.calculateLeaveDays(
        new Date(request.startDate),
        new Date(request.endDate),
        request.halfDay
      );
      
      const policy = await this.repository.findPolicyById(request.policyId);
      if (policy) {
        await this.repository.updateBalance(
          request.userId,
          request.policyId,
          -leaveDays
        );
      }
    }

    // Create audit log
    await this.repository.createAuditLog(
      requestId,
      dto.status,
      actorId,
      dto.rejectionReason || null
    );

    return updated;
  }

  async cancelLeaveRequest(
    requestId: number,
    userId: number,
    isAdmin: boolean
  ): Promise<LeaveRequest> {
    const request = await this.repository.findLeaveRequestById(requestId);
    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    // Only owner or admin can cancel
    if (request.userId !== userId && !isAdmin) {
      throw new ForbiddenError('Cannot cancel another user\'s leave request');
    }

    if (request.status !== 'PENDING') {
      throw new ConflictError(`Cannot cancel leave request with status: ${request.status}`);
    }

    const updated = await this.repository.updateLeaveRequestStatus(
      requestId,
      'CANCELLED',
      userId,
      null
    );

    if (!updated) {
      throw new Error('Failed to cancel leave request');
    }

    // Create audit log
    await this.repository.createAuditLog(
      requestId,
      'CANCELLED',
      userId,
      'Leave request cancelled by user'
    );

    return updated;
  }

  private calculateLeaveDays(
    startDate: Date,
    endDate: Date,
    halfDay: 'AM' | 'PM' | null
  ): number {
    // Use database function or calculate in JS
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (halfDay) {
      // Single day half-day = 0.5, multi-day with half-day = diffDays - 0.5
      return diffDays === 1 ? 0.5 : diffDays - 0.5;
    }

    return diffDays;
  }
}

