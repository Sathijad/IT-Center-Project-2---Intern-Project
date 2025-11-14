import { LeaveRepository } from '../repositories/leaveRepository';
import { ApplicationError, ForbiddenError, NotFoundError } from '../common/errors';
import { AuthenticatedUser, LeaveStatus } from '../common/types';
import { LeaveRequest, LeaveRequestFilters } from '../domain/models';
import { calculateLeaveDays, normalizeDateOnly } from '../utils/dateUtils';
import { logger } from '../common/logger';
import { MsGraphService } from './msGraphService';

interface CreateLeaveInput {
  policyId: number;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason?: string | null;
  idempotencyKey?: string;
}

interface UpdateLeaveInput {
  requestId: number;
  action: 'APPROVE' | 'REJECT' | 'CANCEL';
  notes?: string | null;
}

export class LeaveService {
  private readonly graphService: MsGraphService;

  constructor(private readonly repository = new LeaveRepository(), graphService?: MsGraphService) {
    this.graphService = graphService ?? new MsGraphService(this.repository);
  }

  async getBalances(userId: number, year?: number) {
    const targetYear = year ?? new Date().getUTCFullYear();
    const balances = await this.repository.getLeaveBalances(userId, targetYear);

    if (balances.length === 0) {
      const policies = await this.repository.getLeavePolicies();
      await Promise.all(
        policies.map((policy) =>
          this.repository.initializeLeaveBalance(userId, policy.policy_id, policy.annual_limit, targetYear),
        ),
      );
      return this.repository.getLeaveBalances(userId, targetYear);
    }

    return balances;
  }

  async listRequests(user: AuthenticatedUser, filters: LeaveRequestFilters) {
    const scopedFilters = { ...filters };

    if (user.roles.includes('ADMIN')) {
      scopedFilters.userId = filters.userId ?? null;
    } else {
      scopedFilters.userId = user.userId;
    }

    return this.repository.getLeaveRequests(scopedFilters);
  }

  async createRequest(user: AuthenticatedUser, input: CreateLeaveInput): Promise<LeaveRequest> {
    const rawInput = input as unknown as Record<string, unknown>;
    const policies = await this.repository.getLeavePolicies();
    logger.debug('Leave policies loaded', { count: policies.length, sample: policies.slice(0, 3) });

    const rawPolicyId = rawInput.policyId ?? rawInput.policy_id;
    const policyId = Number(rawPolicyId);

    if (!Number.isFinite(policyId)) {
      logger.warn('Invalid policy id in request', { rawPolicyId, input });
      throw new ApplicationError('POLICY_INVALID', 'Invalid leave policy id', 400);
    }

    const policy = (policies as Array<Record<string, unknown>>).find((p) => {
      const dbId = p.policy_id ?? p.policyId ?? p.id;
      return Number(dbId) === policyId;
    });

    if (!policy) {
      logger.warn('Leave policy not found after normalization', {
        requestedPolicyId: policyId,
        availablePolicyIds: (policies as Array<Record<string, unknown>>).map(
          (p) => p.policy_id ?? p.policyId ?? p.id,
        ),
      });
      throw new ApplicationError('POLICY_NOT_FOUND', 'Leave policy does not exist', 404);
    }

    const rawStart = rawInput.startDate ?? rawInput.start_date;
    const rawEnd = rawInput.endDate ?? rawInput.end_date;

    if (typeof rawStart !== 'string' || typeof rawEnd !== 'string') {
      logger.warn('Missing or invalid start/end dates in request', { rawStart, rawEnd, input });
      throw new ApplicationError('VALIDATION_ERROR', 'Start and end dates are required', 400);
    }

    const start = normalizeDateOnly(rawStart);
    const end = normalizeDateOnly(rawEnd);

    const rawHalfDay = rawInput.halfDay ?? rawInput.half_day;
    const halfDay = Boolean(rawHalfDay);

    if (halfDay && start !== end) {
      throw new ApplicationError('HALF_DAY_INVALID', 'Half-day requests must have identical start and end dates', 400);
    }

    const requestedDays = calculateLeaveDays(start, end, halfDay);
    if (requestedDays <= 0) {
      throw new ApplicationError('LEAVE_DURATION_INVALID', 'Leave duration must be greater than zero', 400);
    }

    const year = new Date(start).getUTCFullYear();
    const balances = await this.getBalances(user.userId, year);
    const balance = balances.find((b) => Number(b.policyId) === policyId);
    if (!balance) {
      throw new ApplicationError('BALANCE_NOT_INITIALIZED', 'Leave balance not initialized for the selected policy', 400);
    }

    if (balance.balanceDays < requestedDays) {
      throw new ApplicationError('INSUFFICIENT_BALANCE', 'Not enough leave balance for the requested days', 409, {
        available: balance.balanceDays,
        requested: requestedDays,
      });
    }

    const hasOverlap = await this.repository.hasOverlappingRequest(user.userId, policyId, start, end);

    if (hasOverlap) {
      throw new ApplicationError('LEAVE_OVERLAP', 'Overlapping leave request exists', 409, {
        startDate: start,
        endDate: end,
      });
    }

    const request = await this.repository.createLeaveRequest({
      userId: user.userId,
      userEmail: user.email,
      userName: user.displayName ?? user.email,
      userTeamId: user.teamId ?? null,
      policyId,
      startDate: start,
      endDate: end,
      halfDay,
      reason: input.reason,
    });

    logger.info('Leave request created', { userId: user.userId, requestId: request.requestId });
    return request;
  }

  async updateRequest(user: AuthenticatedUser, input: UpdateLeaveInput): Promise<LeaveRequest> {
    const request = await this.repository.getLeaveRequestById(input.requestId);

    if (!request) {
      throw new NotFoundError('Leave request not found', { requestId: input.requestId });
    }

    const isOwner = request.userId === user.userId;
    const isAdmin = user.roles.includes('ADMIN');

    if (!isAdmin && !(isOwner && input.action === 'CANCEL')) {
      throw new ForbiddenError('User cannot perform this action on leave request');
    }

    if (input.action === 'CANCEL' && request.status !== 'PENDING' && request.status !== 'APPROVED') {
      throw new ApplicationError('INVALID_STATE', 'Only pending or approved requests can be cancelled', 400);
    }

    if ((input.action === 'APPROVE' || input.action === 'REJECT') && !isAdmin) {
      throw new ForbiddenError('Only administrators can approve or reject leave requests');
    }

    if (request.status === 'CANCELLED') {
      throw new ApplicationError('ALREADY_CANCELLED', 'Leave request is already cancelled', 409);
    }

    if (request.status === 'REJECTED' && input.action !== 'CANCEL') {
      throw new ApplicationError('ALREADY_REJECTED', 'Leave request is already rejected', 409);
    }

    const statusMap: Record<UpdateLeaveInput['action'], LeaveStatus> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      CANCEL: 'CANCELLED',
    };

    const newStatus = statusMap[input.action];

    if (request.status === newStatus) {
      return request;
    }

    const requestedDays = request.daysRequested;
    const year = new Date(request.startDate).getUTCFullYear();

    if (input.action === 'APPROVE') {
      const balances = await this.getBalances(request.userId, year);

      const requestPolicyId =
        Number((request as unknown as Record<string, unknown>).policyId ?? (request as unknown as Record<string, unknown>).policy_id) ||
        request.policyId;

      const balance = balances.find((b) => {
        const raw = b as unknown as Record<string, unknown>;
        const dbPolicyId = Number(raw.policyId ?? raw.policy_id ?? raw.policy);
        return Number(dbPolicyId) === Number(requestPolicyId);
      });

      const balanceRecord = balance as unknown as Record<string, unknown>;
      const available = Number(balanceRecord?.balanceDays ?? balanceRecord?.balance_days ?? balance?.balanceDays ?? 0);

      if (!balance || available < requestedDays) {
        throw new ApplicationError('INSUFFICIENT_BALANCE', 'Not enough balance to approve the leave request', 409, {
          available,
          requested: requestedDays,
        });
      }
    }

    if (input.action !== 'CANCEL') {
      const hasOverlap = await this.repository.hasOverlappingRequest(
        request.userId,
        request.policyId,
        request.startDate,
        request.endDate,
        request.requestId,
      );

      if (hasOverlap) {
        throw new ApplicationError('LEAVE_OVERLAP', 'Overlapping leave request exists', 409, {
          requestId: request.requestId,
        });
      }
    }

    const updated = await this.repository.transitionLeaveRequest({
      requestId: request.requestId,
      newStatus,
      actorId: user.userId,
      actorEmail: user.email,
      actorName: user.displayName ?? user.email,
      notes: input.notes,
      daysToAdjust: newStatus === 'APPROVED' ? requestedDays : request.status === 'APPROVED' ? requestedDays : 0,
    });

    logger.info('Leave request status updated', {
      requestId: updated.requestId,
      newStatus: updated.status,
      actorId: user.userId,
    });

    if (updated.status === 'APPROVED') {
      await this.graphService.enqueueCalendarSync(updated.requestId);
    }

    return updated;
  }
}

