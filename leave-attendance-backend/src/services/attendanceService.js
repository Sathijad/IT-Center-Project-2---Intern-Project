import { AttendanceRepository } from '../repositories/attendanceRepository.js';

export class AttendanceService {
  constructor() {
    this.attendanceRepo = new AttendanceRepository();
  }

  async getAttendanceLogs(filters) {
    return await this.attendanceRepo.getAttendanceLogs(filters);
  }

  async clockIn(userId, geoLocation) {
    // Check for active clock-in
    const activeClockIn = await this.attendanceRepo.getActiveClockIn(userId);
    if (activeClockIn) {
      const error = new Error('Active clock-in already exists');
      error.code = 'ACTIVE_CLOCK_IN_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    // Validate geofencing (if enabled)
    if (process.env.GEO_VALIDATION_ENABLED === 'true') {
      await this.validateGeofence(geoLocation);
    }

    const clockInTime = new Date();
    return await this.attendanceRepo.createClockIn(
      userId,
      clockInTime,
      geoLocation
    );
  }

  async clockOut(userId, geoLocation = null) {
    const activeClockIn = await this.attendanceRepo.getActiveClockIn(userId);
    if (!activeClockIn) {
      const error = new Error('No active clock-in found');
      error.statusCode = 404;
      throw error;
    }

    const clockOutTime = new Date();
    const durationMinutes = this.attendanceRepo.calculateDuration(
      activeClockIn.clock_in,
      clockOutTime
    );

    // Ensure log_id is a number
    const logId = typeof activeClockIn.log_id === 'number' 
      ? activeClockIn.log_id 
      : parseInt(activeClockIn.log_id, 10);
    
    if (isNaN(logId)) {
      throw new Error(`Invalid log_id: ${activeClockIn.log_id}`);
    }

    // Ensure durationMinutes is a valid integer
    if (typeof durationMinutes !== 'number' || isNaN(durationMinutes)) {
      throw new Error(`Invalid durationMinutes: ${durationMinutes}`);
    }

    return await this.attendanceRepo.updateClockOut(
      logId,
      clockOutTime,
      Math.floor(durationMinutes), // Ensure it's an integer
      geoLocation
    );
  }

  async validateGeofence(geoLocation) {
    // Simple radius-based validation
    // In production, this would check against configured office locations
    const officeLat = parseFloat(process.env.OFFICE_LATITUDE || '0');
    const officeLon = parseFloat(process.env.OFFICE_LONGITUDE || '0');
    const allowedRadius = parseFloat(process.env.GEOFENCE_RADIUS_METERS || '1000');

    const distance = this.calculateDistance(
      geoLocation.latitude,
      geoLocation.longitude,
      officeLat,
      officeLon
    );

    if (distance > allowedRadius) {
      const error = new Error('Clock-in location outside allowed area');
      error.code = 'GEOFENCE_VIOLATION';
      error.statusCode = 400;
      throw error;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

