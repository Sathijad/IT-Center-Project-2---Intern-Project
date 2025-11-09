export interface LeaveSummaryFilters {
    from?: string;
    to?: string;
    teamId?: number;
}
export interface LeavePolicySummary {
    policyId: number;
    policyName: string;
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
}
export interface LeaveSummaryTotals {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
}
export interface LeaveSummaryResult {
    range: {
        from?: string;
        to?: string;
    };
    policies: LeavePolicySummary[];
    totals: LeaveSummaryTotals;
}
export declare class ReportRepository {
    getLeaveSummary(filters: LeaveSummaryFilters): Promise<LeaveSummaryResult>;
}
