"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const leaveRepository_1 = require("../repositories/leaveRepository");
const errors_1 = require("../common/errors");
const dateUtils_1 = require("../utils/dateUtils");
const logger_1 = require("../common/logger");
const msGraphService_1 = require("./msGraphService");
class LeaveService {
    repository;
    graphService;
    constructor(repository = new leaveRepository_1.LeaveRepository(), graphService) {
        this.repository = repository;
        this.graphService = graphService ?? new msGraphService_1.MsGraphService(this.repository);
    }
    async getBalances(userId, year) {
        const targetYear = year ?? new Date().getUTCFullYear();
        const balances = await this.repository.getLeaveBalances(userId, targetYear);
        if (balances.length === 0) {
            const policies = await this.repository.getLeavePolicies();
            await Promise.all(policies.map((policy) => this.repository.initializeLeaveBalance(userId, policy.policy_id, policy.annual_limit, targetYear)));
            return this.repository.getLeaveBalances(userId, targetYear);
        }
        return balances;
    }
    async listRequests(user, filters) {
        const scopedFilters = { ...filters };
        if (user.roles.includes('ADMIN')) {
            scopedFilters.userId = filters.userId ?? null;
        }
        else {
            scopedFilters.userId = user.userId;
        }
        return this.repository.getLeaveRequests(scopedFilters);
    }
    async createRequest(user, input) {
        const policies = await this.repository.getLeavePolicies();
        const policy = policies.find((p) => p.policy_id === input.policyId);
        if (!policy) {
            throw new errors_1.ApplicationError('POLICY_NOT_FOUND', 'Leave policy does not exist', 404);
        }
        const start = (0, dateUtils_1.normalizeDateOnly)(input.startDate);
        const end = (0, dateUtils_1.normalizeDateOnly)(input.endDate);
        const halfDay = Boolean(input.halfDay);
        if (halfDay && start !== end) {
            throw new errors_1.ApplicationError('HALF_DAY_INVALID', 'Half-day requests must have identical start and end dates', 400);
        }
        const requestedDays = (0, dateUtils_1.calculateLeaveDays)(start, end, halfDay);
        if (requestedDays <= 0) {
            throw new errors_1.ApplicationError('LEAVE_DURATION_INVALID', 'Leave duration must be greater than zero', 400);
        }
        const year = new Date(start).getUTCFullYear();
        const balances = await this.getBalances(user.userId, year);
        const balance = balances.find((b) => b.policyId === input.policyId);
        if (!balance) {
            throw new errors_1.ApplicationError('BALANCE_NOT_INITIALIZED', 'Leave balance not initialized for the selected policy', 400);
        }
        if (balance.balanceDays < requestedDays) {
            throw new errors_1.ApplicationError('INSUFFICIENT_BALANCE', 'Not enough leave balance for the requested days', 409, {
                available: balance.balanceDays,
                requested: requestedDays,
            });
        }
        const hasOverlap = await this.repository.hasOverlappingRequest(user.userId, input.policyId, start, end);
        if (hasOverlap) {
            throw new errors_1.ApplicationError('LEAVE_OVERLAP', 'Overlapping leave request exists', 409, {
                startDate: start,
                endDate: end,
            });
        }
        const request = await this.repository.createLeaveRequest({
            userId: user.userId,
            policyId: input.policyId,
            startDate: start,
            endDate: end,
            halfDay,
            reason: input.reason,
        });
        logger_1.logger.info('Leave request created', { userId: user.userId, requestId: request.requestId });
        return request;
    }
    async updateRequest(user, input) {
        const request = await this.repository.getLeaveRequestById(input.requestId);
        if (!request) {
            throw new errors_1.NotFoundError('Leave request not found', { requestId: input.requestId });
        }
        const isOwner = request.userId === user.userId;
        const isAdmin = user.roles.includes('ADMIN');
        if (!isAdmin && !(isOwner && input.action === 'CANCEL')) {
            throw new errors_1.ForbiddenError('User cannot perform this action on leave request');
        }
        if (input.action === 'CANCEL' && request.status !== 'PENDING' && request.status !== 'APPROVED') {
            throw new errors_1.ApplicationError('INVALID_STATE', 'Only pending or approved requests can be cancelled', 400);
        }
        if ((input.action === 'APPROVE' || input.action === 'REJECT') && !isAdmin) {
            throw new errors_1.ForbiddenError('Only administrators can approve or reject leave requests');
        }
        if (request.status === 'CANCELLED') {
            throw new errors_1.ApplicationError('ALREADY_CANCELLED', 'Leave request is already cancelled', 409);
        }
        if (request.status === 'REJECTED' && input.action !== 'CANCEL') {
            throw new errors_1.ApplicationError('ALREADY_REJECTED', 'Leave request is already rejected', 409);
        }
        const statusMap = {
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
            const balance = balances.find((b) => b.policyId === request.policyId);
            if (!balance || balance.balanceDays < requestedDays) {
                throw new errors_1.ApplicationError('INSUFFICIENT_BALANCE', 'Not enough balance to approve the leave request', 409, {
                    available: balance?.balanceDays ?? 0,
                    requested: requestedDays,
                });
            }
        }
        if (input.action !== 'CANCEL') {
            const hasOverlap = await this.repository.hasOverlappingRequest(request.userId, request.policyId, request.startDate, request.endDate, request.requestId);
            if (hasOverlap) {
                throw new errors_1.ApplicationError('LEAVE_OVERLAP', 'Overlapping leave request exists', 409, {
                    requestId: request.requestId,
                });
            }
        }
        const updated = await this.repository.transitionLeaveRequest({
            requestId: request.requestId,
            newStatus,
            actorId: user.userId,
            notes: input.notes,
            daysToAdjust: newStatus === 'APPROVED' ? requestedDays : request.status === 'APPROVED' ? requestedDays : 0,
        });
        logger_1.logger.info('Leave request status updated', {
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
exports.LeaveService = LeaveService;
//# sourceMappingURL=leaveService.js.map