import { AttendanceService } from './attendanceService';
import { ApplicationError, ForbiddenError } from '../common/errors';
import type { AuthenticatedUser } from '../common/types';

class FakeAttendanceRepository {
  getLogs = jest.fn();
  getOpenLog = jest.fn();
  insertClockIn = jest.fn();
  updateClockOut = jest.fn();
  closeOpenSessionWithTransaction = jest.fn();
}

const makeUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 1,
  email: 'user@example.com',
  displayName: 'Test User',
  teamId: 10,
  roles: ['EMPLOYEE'],
  sub: 'test-sub-123',
  ...overrides,
});

describe('AttendanceService', () => {
  let repository: FakeAttendanceRepository;
  let service: AttendanceService;

  beforeEach(() => {
    repository = new FakeAttendanceRepository();
    service = new AttendanceService(repository as any);
    // Reset env vars
    delete process.env.GEO_VALIDATION_ENABLED;
    delete process.env.GEO_CENTER_LAT;
    delete process.env.GEO_CENTER_LONG;
    delete process.env.GEO_RADIUS_METERS;
  });

  describe('listLogs', () => {
    it('scopes to user ID for non-admin users', async () => {
      const user = makeUser({ roles: ['EMPLOYEE'] });
      repository.getLogs.mockResolvedValue([]);

      await service.listLogs(user, { page: 1, size: 10 });

      expect(repository.getLogs).toHaveBeenCalledWith({
        page: 1,
        size: 10,
        userId: user.userId,
      });
    });

    it('allows admin to filter by any user ID', async () => {
      const admin = makeUser({ roles: ['ADMIN'] });
      repository.getLogs.mockResolvedValue([]);

      await service.listLogs(admin, { page: 1, size: 10, userId: 999 });

      expect(repository.getLogs).toHaveBeenCalledWith({
        page: 1,
        size: 10,
        userId: 999,
      });
    });

    it('allows admin to view all logs when userId is null', async () => {
      const admin = makeUser({ roles: ['ADMIN'] });
      repository.getLogs.mockResolvedValue([]);

      await service.listLogs(admin, { page: 1, size: 10 });

      expect(repository.getLogs).toHaveBeenCalledWith({
        page: 1,
        size: 10,
        userId: null,
      });
    });
  });

  describe('clockIn', () => {
    const user = makeUser();

    beforeEach(() => {
      repository.getOpenLog.mockResolvedValue(null);
      repository.insertClockIn.mockResolvedValue({
        logId: 100,
        userId: user.userId,
        clockIn: '2025-03-10T09:00:00Z',
        clockOut: null,
        durationMinutes: null,
      });
    });

    it('creates a clock-in record successfully', async () => {
      const result = await service.clockIn(user, {
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
      });

      expect(repository.insertClockIn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.userId,
          userEmail: user.email,
          userName: user.displayName,
          latitude: -37.8136,
          longitude: 144.9631,
          source: 'mobile',
        }),
      );
      expect(result.logId).toBe(100);
    });

    it('uses current timestamp when not provided', async () => {
      const before = new Date();
      await service.clockIn(user, {});
      const after = new Date();

      const callArgs = repository.insertClockIn.mock.calls[0][0];
      const clockInTime = new Date(callArgs.clockIn);
      expect(clockInTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(clockInTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('uses provided timestamp', async () => {
      const timestamp = '2025-03-10T09:00:00Z';
      await service.clockIn(user, { timestamp });

      expect(repository.insertClockIn).toHaveBeenCalledWith(
        expect.objectContaining({
          clockIn: expect.stringMatching(/^2025-03-10T09:00:00/),
        }),
      );
    });

    it('throws when user already has an open session', async () => {
      repository.getOpenLog.mockResolvedValue({
        logId: 50,
        userId: user.userId,
        clockIn: '2025-03-10T08:00:00Z',
      });

      await expect(service.clockIn(user, {})).rejects.toMatchObject({
        code: 'CLOCK_ALREADY_STARTED',
        statusCode: 409,
      });
    });

    it('throws when timestamp is invalid', async () => {
      // Invalid date throws RangeError when calling toISOString()
      await expect(service.clockIn(user, { timestamp: 'invalid-date' })).rejects.toThrow();
    });

    describe('geo-fencing', () => {
      beforeEach(() => {
        process.env.GEO_VALIDATION_ENABLED = 'true';
        process.env.GEO_CENTER_LAT = '-37.8136';
        process.env.GEO_CENTER_LONG = '144.9631';
        process.env.GEO_RADIUS_METERS = '150';
      });

      it('throws when geo validation is enabled but coordinates are missing', async () => {
        await expect(service.clockIn(user, {})).rejects.toMatchObject({
          code: 'GEO_REQUIRED',
          statusCode: 400,
        });
      });

      it('throws when latitude is missing', async () => {
        await expect(service.clockIn(user, { longitude: 144.9631 })).rejects.toMatchObject({
          code: 'GEO_REQUIRED',
        });
      });

      it('throws when longitude is missing', async () => {
        await expect(service.clockIn(user, { latitude: -37.8136 })).rejects.toMatchObject({
          code: 'GEO_REQUIRED',
        });
      });

      it('throws when outside geofence', async () => {
        // Far away coordinates
        await expect(
          service.clockIn(user, {
            latitude: -40.0,
            longitude: 150.0,
          }),
        ).rejects.toMatchObject({
          code: 'GEO_OUT_OF_RANGE',
          statusCode: 403,
        });
      });

      it('allows clock-in when within geofence', async () => {
        await service.clockIn(user, {
          latitude: -37.8136,
          longitude: 144.9631,
        });

        expect(repository.insertClockIn).toHaveBeenCalled();
      });

      it('allows clock-in when geo validation is disabled', async () => {
        process.env.GEO_VALIDATION_ENABLED = 'false';

        await service.clockIn(user, {});

        expect(repository.insertClockIn).toHaveBeenCalled();
      });

      it('uses default radius of 150 meters when not configured', async () => {
        delete process.env.GEO_RADIUS_METERS;

        await service.clockIn(user, {
          latitude: -37.8136,
          longitude: 144.9631,
        });

        expect(repository.insertClockIn).toHaveBeenCalled();
      });
    });

    it('defaults source to "mobile" when not provided', async () => {
      await service.clockIn(user, {});

      expect(repository.insertClockIn).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'mobile',
        }),
      );
    });

    it('uses user email as userName when displayName is null', async () => {
      const userWithoutName = makeUser({ displayName: null });

      await service.clockIn(userWithoutName, {});

      expect(repository.insertClockIn).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: userWithoutName.email,
        }),
      );
    });
  });

  describe('clockOut', () => {
    const user = makeUser();
    const openLog = {
      logId: 100,
      userId: user.userId,
      clockIn: '2025-03-10T09:00:00Z',
      clockOut: null,
      durationMinutes: null,
    };

    beforeEach(() => {
      repository.getOpenLog.mockResolvedValue(openLog);
      repository.updateClockOut.mockResolvedValue({
        ...openLog,
        clockOut: '2025-03-10T17:00:00Z',
        durationMinutes: 480,
      });
    });

    it('clocks out successfully and calculates duration', async () => {
      const result = await service.clockOut(user, {});

      expect(repository.updateClockOut).toHaveBeenCalledWith(
        expect.objectContaining({
          logId: openLog.logId,
          userId: user.userId,
          durationMinutes: expect.any(Number),
        }),
      );
      expect(result.durationMinutes).toBe(480);
    });

    it('throws when no open session exists', async () => {
      repository.getOpenLog.mockResolvedValue(null);

      await expect(service.clockOut(user, {})).rejects.toMatchObject({
        code: 'NO_OPEN_SESSION',
        statusCode: 409,
      });
    });

    it('throws when timestamp is invalid', async () => {
      // Invalid date throws RangeError when calling toISOString()
      await expect(service.clockOut(user, { timestamp: 'invalid' })).rejects.toThrow();
    });

    it('throws when clock-out is before clock-in', async () => {
      repository.getOpenLog.mockResolvedValue({
        ...openLog,
        clockIn: '2025-03-10T17:00:00Z',
      });

      await expect(
        service.clockOut(user, {
          timestamp: '2025-03-10T09:00:00Z', // Before clock-in
        }),
      ).rejects.toThrow('Clock-out must be after clock-in');
    });

    it('uses provided timestamp', async () => {
      const timestamp = '2025-03-10T17:00:00Z';
      await service.clockOut(user, { timestamp });

      expect(repository.updateClockOut).toHaveBeenCalledWith(
        expect.objectContaining({
          clockOut: expect.stringMatching(/^2025-03-10T17:00:00/),
        }),
      );
    });
  });

  describe('forceClockOut', () => {
    const admin = makeUser({ roles: ['ADMIN'] });
    const targetUserId = 999;
    const openLog = {
      logId: 200,
      userId: targetUserId,
      clockIn: '2025-03-10T09:00:00Z',
      clockOut: null,
      durationMinutes: null,
    };

    beforeEach(() => {
      repository.getOpenLog.mockResolvedValue(openLog);
      repository.closeOpenSessionWithTransaction.mockResolvedValue({
        ...openLog,
        clockOut: '2025-03-10T17:00:00Z',
        durationMinutes: 480,
      });
    });

    it('allows admin to force clock-out for any user', async () => {
      const result = await service.forceClockOut(admin, targetUserId, {});

      expect(repository.getOpenLog).toHaveBeenCalledWith(targetUserId);
      expect(repository.closeOpenSessionWithTransaction).toHaveBeenCalledWith(
        targetUserId,
        expect.objectContaining({
          durationMinutes: expect.any(Number),
        }),
      );
      expect(result.durationMinutes).toBe(480);
    });

    it('throws when non-admin tries to force clock-out', async () => {
      const employee = makeUser({ roles: ['EMPLOYEE'] });

      await expect(service.forceClockOut(employee, targetUserId, {})).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('throws when target user has no open session', async () => {
      repository.getOpenLog.mockResolvedValue(null);

      await expect(service.forceClockOut(admin, targetUserId, {})).rejects.toMatchObject({
        code: 'NO_OPEN_SESSION',
        statusCode: 404,
      });
    });

    it('uses provided timestamp', async () => {
      const timestamp = '2025-03-10T18:00:00Z';
      await service.forceClockOut(admin, targetUserId, { timestamp });

      expect(repository.closeOpenSessionWithTransaction).toHaveBeenCalledWith(
        targetUserId,
        expect.objectContaining({
          clockOut: expect.stringMatching(/^2025-03-10T18:00:00/),
        }),
      );
    });
  });
});

