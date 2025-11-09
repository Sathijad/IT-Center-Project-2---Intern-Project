import { AttendanceFilters, AttendanceLog } from '../domain/models';
export declare class AttendanceRepository {
    getLogs(filters: AttendanceFilters): Promise<import("../common/types").PaginatedResult<AttendanceLog>>;
    getOpenLog(userId: number): Promise<AttendanceLog | null>;
    insertClockIn(params: {
        userId: number;
        clockIn: string;
        latitude?: number | null;
        longitude?: number | null;
        source?: string | null;
    }): Promise<AttendanceLog>;
    updateClockOut(params: {
        logId: number;
        userId: number;
        clockOut: string;
        durationMinutes: number;
    }): Promise<AttendanceLog>;
    closeOpenSessionWithTransaction(userId: number, update: {
        clockOut: string;
        durationMinutes: number;
    }): Promise<AttendanceLog>;
}
