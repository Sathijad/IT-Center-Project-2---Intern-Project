import { LeaveRepository } from '../repositories/leave.repository';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ERROR_CODES,
} from '../lib/errors';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequest } from '../types';

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

    // Validate halfDay can only be used for single-day requests
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    if (dto.halfDay && startDateStr !== endDateStr) {
      throw new ValidationError('halfDay is only allowed for single-day leave requests (startDate must equal endDate)', {
        code: ERROR_CODES.INVALID_DATE_RANGE,
      });
    }

    // Validate required fields (policyId should be a positive number)
    if (typeof dto.policyId !== 'number' || isNaN(dto.policyId) || dto.policyId <= 0) {
      throw new ValidationError('policyId is required and must be a positive number');
    }

    // Get policy
    let policy;
    try {
      policy = await this.repository.findPolicyById(dto.policyId);
    } catch (error: unknown) {
      // Handle database errors (e.g., connection issues, constraint violations)
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '23503') {
        // Foreign key violation
        throw new NotFoundError('Leave policy not found');
      }
      throw error; // Re-throw other errors
    }

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
    const leaveDays = this.calculateLeaveDays(startDate, endDate, dto.halfDay ?? null);

    // Check balance with COALESCE safety
    let balance;
    try {
      balance = await this.repository.findBalanceByUserAndPolicy(userId, dto.policyId);
      if (!balance) {
        // Initialize balance - use policy.maxDays or default to 0 if not available
        const initialBalance = Number.isFinite(policy.maxDays) && policy.maxDays >= 0 
          ? policy.maxDays 
          : 0;
        
        await this.repository.upsertBalance(userId, dto.policyId, initialBalance);
        balance = await this.repository.findBalanceByUserAndPolicy(userId, dto.policyId);
        if (!balance) {
          throw new Error('Failed to initialize leave balance');
        }
      }
    } catch (error: unknown) {
      // Handle database errors
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '23503') {
        throw new ValidationError('Invalid user or policy reference');
      }
      if (dbError.code === '23502') {
        throw new ValidationError('Missing required field in leave balance (balance_days)');
      }
      throw error;
    }

    // Use COALESCE to ensure we never get NULL
    const currentBalance = Number.isFinite(balance.balanceDays) 
      ? parseFloat(balance.balanceDays.toString()) 
      : 0;
    if (currentBalance < leaveDays) {
      throw new ValidationError(
        `Insufficient leave balance. Available: ${currentBalance}, Requested: ${leaveDays}`,
        { code: ERROR_CODES.INSUFFICIENT_BALANCE }
      );
    }

    // Create request
    let request;
    try {
      request = await this.repository.createLeaveRequest({
        userId,
        policyId: dto.policyId,
        startDate,
        endDate,
        halfDay: dto.halfDay ?? null,
        reason: dto.reason ?? null,
      });
    } catch (error: unknown) {
      // Handle database constraint violations
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '23503') {
        throw new ValidationError('Invalid user or policy reference');
      }
      if (dbError.code === '23502') {
        throw new ValidationError('Missing required field in leave request');
      }
      throw error;
    }

    // Create audit log (don't fail request creation if audit fails)
    try {
      await this.repository.createAuditLog(
        request.id,
        'CREATED',
        userId,
        `Leave request created for ${leaveDays} day(s)`
      );
    } catch (auditError) {
      // Log but don't fail the request
      console.error('Failed to create audit log:', auditError);
    }

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
    // Calculate difference in days (inclusive of both start and end dates)
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Half-day is only valid for single-day requests (already validated above)
    // This calculation should only be reached if halfDay is null or startDate === endDate
    if (halfDay) {
      // Single day half-day = 0.5 days
      return 0.5;
    }

    return diffDays;
  }

  // Initialize balances for a new user
  // Call this when a user is created (from your user creation endpoint/service)
  // Uses transaction for safety
  async initializeUserBalances(userId: number, hireDate?: Date): Promise<unknown[]> {
    const { pool } = await import('../lib/db');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      // Get policies using direct query in transaction
      const policiesResult = await client.query(
        'SELECT id, max_days, accrual_rate, accrual_period FROM leave_policies ORDER BY id'
      );
      const policies = policiesResult.rows;

      // Use FULL allocation by default (set to false for prorated)
      const full = true;

      // Calculate months worked (for prorated allocation)
      let months = 12;
      if (!full && hireDate) {
        const now = new Date();
        const diffMs = now.getTime() - hireDate.getTime();
        months = Math.max(0, Math.min(12, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))));
      } else if (!full) {
        // Fall back to created_at if no hireDate
        const userResult = await client.query(
          'SELECT created_at FROM app_users WHERE id = $1',
          [userId]
        );
        if (userResult.rows[0]?.created_at) {
          const createdDate = new Date(userResult.rows[0].created_at);
          const now = new Date();
          const diffMs = now.getTime() - createdDate.getTime();
          months = Math.max(0, Math.min(12, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))));
        }
      }

      const results: unknown[] = [];

      for (const p of policies) {
        // Calculate per month accrual rate
        const accrualRate = Number(p.accrual_rate) || 0;
        const maxDays = Number(p.max_days) || 0;
        const perMonth = accrualRate > 0 
          ? accrualRate 
          : (maxDays / 12.0);
        
        // Calculate starting balance
        const start = full 
          ? maxDays 
          : Math.round(Math.max(0, months * perMonth) * 100) / 100;

        // Upsert using direct SQL in transaction
        const upsertResult = await client.query(
          `INSERT INTO leave_balances (user_id, policy_id, balance_days)
           VALUES ($1, $2, GREATEST(0, $3))
           ON CONFLICT (user_id, policy_id)
           DO UPDATE SET 
             balance_days = GREATEST(0, COALESCE(leave_balances.balance_days, 0) + EXCLUDED.balance_days),
             updated_at = CURRENT_TIMESTAMP
           RETURNING balance_days`,
          [userId, p.id, start]
        );

        results.push({
          policyId: p.id,
          balanceDays: Number(upsertResult.rows[0]?.balance_days || 0),
        });
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

