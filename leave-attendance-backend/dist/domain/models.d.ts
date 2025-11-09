import { LeaveStatus } from '../common/types';
export interface LeaveBalance {
    balanceId: number;
    policyId: number;
    policyName: string;
    balanceDays: number;
    year: number;
}
export interface LeaveRequest {
    requestId: number;
    userId: number;
    userEmail: string;
    userName: string | null;
    policyId: number;
    policyName: string;
    status: LeaveStatus;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    reason: string | null;
    graphEventId: string | null;
    createdAt: string;
    updatedAt: string;
    daysRequested: number;
}
export interface LeaveRequestFilters {
    userId?: number | null;
    status?: LeaveStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
    sort?: string;
}
export interface AttendanceLog {
    logId: number;
    userId: number;
    clockIn: string;
    clockOut: string | null;
    durationMinutes: number | null;
    latitude: number | null;
    longitude: number | null;
    source: string | null;
    createdAt: string;
}
export interface AttendanceFilters {
    userId?: number | null;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    sort?: string;
}
