import { AttendanceRepository } from '../repositories/attendanceRepository';
import { ApplicationError, ForbiddenError } from '../common/errors';
import { AuthenticatedUser } from '../common/types';
import { AttendanceFilters, AttendanceLog } from '../domain/models';
import { calculateDurationMinutes, isWithinGeoFence } from '../utils/dateUtils';
import { logger } from '../common/logger';

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

const isGeoValidationEnabled = (): boolean => process.env.GEO_VALIDATION_ENABLED?.toLowerCase() === 'true';

export class AttendanceService {
  constructor(private readonly repository = new AttendanceRepository()) {}

  async listLogs(user: AuthenticatedUser, filters: AttendanceFilters) {
    const scopedFilters = { ...filters };
    if (user.roles.includes('ADMIN')) {
      scopedFilters.userId = filters.userId ?? null;
    } else {
      scopedFilters.userId = user.userId;
    }

    return this.repository.getLogs(scopedFilters);
  }

  async clockIn(user: AuthenticatedUser, input: ClockInInput): Promise<AttendanceLog> {
    const existing = await this.repository.getOpenLog(user.userId);
    if (existing) {
      throw new ApplicationError('CLOCK_ALREADY_STARTED', 'You have an open attendance session', 409, {
        logId: existing.logId,
      });
    }

    const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();

    if (Number.isNaN(new Date(timestamp).getTime())) {
      throw new ApplicationError('INVALID_TIMESTAMP', 'Clock-in timestamp is invalid', 400);
    }

    if (isGeoValidationEnabled()) {
      const latitude = input.latitude;
      const longitude = input.longitude;

      if (latitude === undefined || longitude === undefined) {
        throw new ApplicationError('GEO_REQUIRED', 'Latitude and longitude are required for geo validation', 400);
      }

      const permittedLat = Number(process.env.GEO_CENTER_LAT);
      const permittedLong = Number(process.env.GEO_CENTER_LONG);
      const radius = Number(process.env.GEO_RADIUS_METERS || 150);

      if (
        Number.isNaN(permittedLat) ||
        Number.isNaN(permittedLong) ||
        !isWithinGeoFence(latitude, longitude, permittedLat, permittedLong, radius)
      ) {
        throw new ApplicationError('GEO_OUT_OF_RANGE', 'You are outside the allowed area for clock-in', 403);
      }
    }

    const log = await this.repository.insertClockIn({
      userId: user.userId,
      userEmail: user.email,
      userName: user.displayName ?? user.email,
      userTeamId: user.teamId ?? null,
      clockIn: timestamp,
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source ?? 'mobile',
    });

    logger.info('Attendance clock-in recorded', { userId: user.userId, logId: log.logId });
    return log;
  }

  async clockOut(user: AuthenticatedUser, input: ClockOutInput): Promise<AttendanceLog> {
    const openLog = await this.repository.getOpenLog(user.userId);
    if (!openLog) {
      throw new ApplicationError('NO_OPEN_SESSION', 'No open attendance session to clock out of', 409);
    }

    const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
    if (Number.isNaN(new Date(timestamp).getTime())) {
      throw new ApplicationError('INVALID_TIMESTAMP', 'Clock-out timestamp is invalid', 400);
    }

    const duration = calculateDurationMinutes(openLog.clockIn, timestamp);
    if (duration < 0) {
      throw new ApplicationError('NEGATIVE_DURATION', 'Clock-out cannot be before clock-in', 400);
    }

    const updated = await this.repository.updateClockOut({
      logId: openLog.logId,
      userId: user.userId,
      clockOut: timestamp,
      durationMinutes: duration,
    });

    logger.info('Attendance clock-out recorded', { userId: user.userId, logId: updated.logId, duration });
    return updated;
  }

  async forceClockOut(admin: AuthenticatedUser, userId: number, input: ClockOutInput): Promise<AttendanceLog> {
    if (!admin.roles.includes('ADMIN')) {
      throw new ForbiddenError('Only administrators can force clock-out');
    }

    const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
    const duration = await (async () => {
      const open = await this.repository.getOpenLog(userId);
      if (!open) {
        throw new ApplicationError('NO_OPEN_SESSION', 'No open attendance session found', 404);
      }
      return calculateDurationMinutes(open.clockIn, timestamp);
    })();

    return this.repository.closeOpenSessionWithTransaction(userId, {
      clockOut: timestamp,
      durationMinutes: duration,
    });
  }
}

