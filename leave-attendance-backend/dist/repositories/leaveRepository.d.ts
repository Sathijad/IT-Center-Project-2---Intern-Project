import { PoolClient } from 'pg';
import { LeaveBalance, LeaveRequest, LeaveRequestFilters } from '../domain/models';
export declare class LeaveRepository {
    getLeaveBalances(userId: number, year: number): Promise<LeaveBalance[]>;
    getLeavePolicies(): Promise<{
        policy_id: number;
        name: string;
        annual_limit: number;
    }[]>;
    initializeLeaveBalance(userId: number, policyId: number, annualLimit: number, year: number): Promise<void>;
    getLeaveRequests(filters: LeaveRequestFilters): Promise<import("../common/types").PaginatedResult<LeaveRequest>>;
    getLeaveRequestById(requestId: number): Promise<LeaveRequest | null>;
    insertLeaveRequest(client: PoolClient, params: {
        userId: number;
        policyId: number;
        startDate: string;
        endDate: string;
        halfDay: boolean;
        reason?: string | null;
    }): Promise<LeaveRequest>;
    updateLeaveRequestStatus(client: PoolClient, requestId: number, status: string, actorId: number, notes?: string | null): Promise<LeaveRequest>;
    adjustLeaveBalance(client: PoolClient, userId: number, policyId: number, year: number, days: number): Promise<void>;
    restoreLeaveBalance(client: PoolClient, userId: number, policyId: number, year: number, days: number): Promise<void>;
    hasOverlappingRequest(userId: number, policyId: number, startDate: string, endDate: string, excludeRequestId?: number): Promise<boolean>;
    createLeaveRequest(params: {
        userId: number;
        policyId: number;
        startDate: string;
        endDate: string;
        halfDay: boolean;
        reason?: string | null;
    }): Promise<LeaveRequest>;
    transitionLeaveRequest(params: {
        requestId: number;
        newStatus: string;
        actorId: number;
        notes?: string | null;
        daysToAdjust?: number;
    }): Promise<LeaveRequest>;
    updateGraphEventId(requestId: number, graphEventId: string | null): Promise<void>;
}
