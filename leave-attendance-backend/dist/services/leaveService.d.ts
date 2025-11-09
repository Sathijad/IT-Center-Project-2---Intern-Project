import { LeaveRepository } from '../repositories/leaveRepository';
import { AuthenticatedUser } from '../common/types';
import { LeaveRequest, LeaveRequestFilters } from '../domain/models';
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
export declare class LeaveService {
    private readonly repository;
    private readonly graphService;
    constructor(repository?: LeaveRepository, graphService?: MsGraphService);
    getBalances(userId: number, year?: number): Promise<import("../domain/models").LeaveBalance[]>;
    listRequests(user: AuthenticatedUser, filters: LeaveRequestFilters): Promise<import("../common/types").PaginatedResult<LeaveRequest>>;
    createRequest(user: AuthenticatedUser, input: CreateLeaveInput): Promise<LeaveRequest>;
    updateRequest(user: AuthenticatedUser, input: UpdateLeaveInput): Promise<LeaveRequest>;
}
export {};
