import { AttendanceRepository } from '../repositories/attendanceRepository';
import { AuthenticatedUser } from '../common/types';
import { AttendanceFilters, AttendanceLog } from '../domain/models';
interface ClockInInput {
    timestamp?: string;
    latitude?: number;
    longitude?: number;
    source?: string;
    idempotencyKey?: string;
}
interface ClockOutInput {
    timestamp?: string;
    idempotencyKey?: string;
}
export declare class AttendanceService {
    private readonly repository;
    constructor(repository?: AttendanceRepository);
    listLogs(user: AuthenticatedUser, filters: AttendanceFilters): Promise<import("../common/types").PaginatedResult<AttendanceLog>>;
    clockIn(user: AuthenticatedUser, input: ClockInInput): Promise<AttendanceLog>;
    clockOut(user: AuthenticatedUser, input: ClockOutInput): Promise<AttendanceLog>;
    forceClockOut(admin: AuthenticatedUser, userId: number, input: ClockOutInput): Promise<AttendanceLog>;
}
export {};
