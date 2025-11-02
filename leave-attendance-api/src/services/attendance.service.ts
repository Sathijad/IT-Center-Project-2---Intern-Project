import { AttendanceRepository } from '../repositories/attendance.repository';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ERROR_CODES,
} from '../lib/errors';
import { ClockInDto, ClockOutDto, AttendanceLog } from '../types';

export class AttendanceService {
  private repository: AttendanceRepository;

  constructor() {
    this.repository = new AttendanceRepository();
  }

  async clockIn(userId: number, dto: ClockInDto): Promise<AttendanceLog> {
    // Check if user already clocked in today
    const activeClockIn = await this.repository.findActiveClockIn(userId);
    if (activeClockIn) {
      throw new ConflictError(
        'Already clocked in. Please clock out first.',
        { code: ERROR_CODES.ALREADY_CLOCKED_IN }
      );
    }

    // Geo validation (if enabled and coordinates provided)
    if (process.env.ENABLE_GEO_VALIDATION === 'true') {
      if (!dto.latitude || !dto.longitude) {
        throw new ValidationError(
          'Geolocation is required for clock-in',
          { code: ERROR_CODES.GEO_OUT_OF_RANGE }
        );
      }
      // TODO: Validate against geofence (company location)
      // For now, just accept coordinates
    }

    const clockIn = new Date();
    const log = await this.repository.createClockIn({
      userId,
      clockIn,
      latitude: dto.latitude,
      longitude: dto.longitude,
      source: dto.source || 'WEB',
    });

    return log;
  }

  async clockOut(userId: number, dto: ClockOutDto): Promise<AttendanceLog> {
    // Find active clock-in
    const activeClockIn = await this.repository.findActiveClockIn(userId);
    if (!activeClockIn) {
      throw new NotFoundError(
        'No active clock-in found. Please clock in first.',
        { code: ERROR_CODES.CLOCK_OUT_MISSING_IN }
      );
    }

    const clockOut = new Date();
    const updated = await this.repository.updateClockOut(
      activeClockIn.id,
      clockOut,
      dto.source || 'WEB'
    );

    if (!updated) {
      throw new Error('Failed to update clock-out');
    }

    return updated;
  }

  async getAttendanceLogs(filters: {
    userId?: number;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    size?: number;
  }): Promise<{ data: AttendanceLog[]; total: number }> {
    return this.repository.findAttendanceLogs(filters);
  }

  async getTodayAttendance(userId: number): Promise<AttendanceLog | null> {
    return this.repository.findTodayAttendance(userId);
  }
}

