"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const attendanceRepository_1 = require("../repositories/attendanceRepository");
const errors_1 = require("../common/errors");
const dateUtils_1 = require("../utils/dateUtils");
const logger_1 = require("../common/logger");
const isGeoValidationEnabled = () => process.env.GEO_VALIDATION_ENABLED?.toLowerCase() === 'true';
class AttendanceService {
    repository;
    constructor(repository = new attendanceRepository_1.AttendanceRepository()) {
        this.repository = repository;
    }
    async listLogs(user, filters) {
        const scopedFilters = { ...filters };
        if (user.roles.includes('ADMIN')) {
            scopedFilters.userId = filters.userId ?? null;
        }
        else {
            scopedFilters.userId = user.userId;
        }
        return this.repository.getLogs(scopedFilters);
    }
    async clockIn(user, input) {
        const existing = await this.repository.getOpenLog(user.userId);
        if (existing) {
            throw new errors_1.ApplicationError('CLOCK_ALREADY_STARTED', 'You have an open attendance session', 409, {
                logId: existing.logId,
            });
        }
        const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
        if (Number.isNaN(new Date(timestamp).getTime())) {
            throw new errors_1.ApplicationError('INVALID_TIMESTAMP', 'Clock-in timestamp is invalid', 400);
        }
        if (isGeoValidationEnabled()) {
            const latitude = input.latitude;
            const longitude = input.longitude;
            if (latitude === undefined || longitude === undefined) {
                throw new errors_1.ApplicationError('GEO_REQUIRED', 'Latitude and longitude are required for geo validation', 400);
            }
            const permittedLat = Number(process.env.GEO_CENTER_LAT);
            const permittedLong = Number(process.env.GEO_CENTER_LONG);
            const radius = Number(process.env.GEO_RADIUS_METERS || 150);
            if (Number.isNaN(permittedLat) ||
                Number.isNaN(permittedLong) ||
                !(0, dateUtils_1.isWithinGeoFence)(latitude, longitude, permittedLat, permittedLong, radius)) {
                throw new errors_1.ApplicationError('GEO_OUT_OF_RANGE', 'You are outside the allowed area for clock-in', 403);
            }
        }
        const log = await this.repository.insertClockIn({
            userId: user.userId,
            clockIn: timestamp,
            latitude: input.latitude,
            longitude: input.longitude,
            source: input.source ?? 'mobile',
        });
        logger_1.logger.info('Attendance clock-in recorded', { userId: user.userId, logId: log.logId });
        return log;
    }
    async clockOut(user, input) {
        const openLog = await this.repository.getOpenLog(user.userId);
        if (!openLog) {
            throw new errors_1.ApplicationError('NO_OPEN_SESSION', 'No open attendance session to clock out of', 409);
        }
        const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
        if (Number.isNaN(new Date(timestamp).getTime())) {
            throw new errors_1.ApplicationError('INVALID_TIMESTAMP', 'Clock-out timestamp is invalid', 400);
        }
        const duration = (0, dateUtils_1.calculateDurationMinutes)(openLog.clockIn, timestamp);
        if (duration < 0) {
            throw new errors_1.ApplicationError('NEGATIVE_DURATION', 'Clock-out cannot be before clock-in', 400);
        }
        const updated = await this.repository.updateClockOut({
            logId: openLog.logId,
            userId: user.userId,
            clockOut: timestamp,
            durationMinutes: duration,
        });
        logger_1.logger.info('Attendance clock-out recorded', { userId: user.userId, logId: updated.logId, duration });
        return updated;
    }
    async forceClockOut(admin, userId, input) {
        if (!admin.roles.includes('ADMIN')) {
            throw new errors_1.ForbiddenError('Only administrators can force clock-out');
        }
        const timestamp = input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString();
        const duration = await (async () => {
            const open = await this.repository.getOpenLog(userId);
            if (!open) {
                throw new errors_1.ApplicationError('NO_OPEN_SESSION', 'No open attendance session found', 404);
            }
            return (0, dateUtils_1.calculateDurationMinutes)(open.clockIn, timestamp);
        })();
        return this.repository.closeOpenSessionWithTransaction(userId, {
            clockOut: timestamp,
            durationMinutes: duration,
        });
    }
}
exports.AttendanceService = AttendanceService;
//# sourceMappingURL=attendanceService.js.map