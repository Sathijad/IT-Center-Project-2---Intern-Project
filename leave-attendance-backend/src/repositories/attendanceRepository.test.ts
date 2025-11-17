import { AttendanceRepository } from './attendanceRepository';
import * as db from '../common/db';

// Mock the database module
jest.mock('../common/db', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

describe('AttendanceRepository', () => {
  let repository: AttendanceRepository;
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
  const mockWithTransaction = db.withTransaction as jest.MockedFunction<typeof db.withTransaction>;

  beforeEach(() => {
    repository = new AttendanceRepository();
    jest.clearAllMocks();
  });

  describe('getLogs', () => {
    it('returns paginated attendance logs', async () => {
      const mockRows = [
        {
          log_id: 1,
          user_id: 100,
          user_name: 'Test User',
          user_email: 'user@example.com',
          user_team_id: 10,
          clock_in: '2025-03-10T09:00:00Z',
          clock_out: '2025-03-10T17:00:00Z',
          duration_minutes: 480,
          latitude: -37.8136,
          longitude: 144.9631,
          source: 'mobile',
          created_at: '2025-03-10T09:00:00Z',
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

      const result = await repository.getLogs({
        userId: 100,
        page: 1,
        size: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        logId: 1,
        userId: 100,
        userName: 'Test User',
        userEmail: 'user@example.com',
        userTeamId: 10,
        clockIn: '2025-03-10T09:00:00Z',
        clockOut: '2025-03-10T17:00:00Z',
        durationMinutes: 480,
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
        createdAt: '2025-03-10T09:00:00Z',
      });
      expect(result.total).toBe(1);
    });

    it('filters by userId when provided', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await repository.getLogs({
        userId: 100,
        page: 1,
        size: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('user_id = $');
    });

    it('filters by date range when provided', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await repository.getLogs({
        userId: 100,
        from: '2025-01-01',
        to: '2025-12-31',
        page: 1,
        size: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('clock_in >=');
      expect(queryCall).toContain('clock_out <=');
    });

    it('returns all logs when userId is null (admin view)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await repository.getLogs({
        userId: null,
        page: 1,
        size: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).not.toContain('user_id =');
    });
  });

  describe('getOpenLog', () => {
    it('returns open attendance log when exists', async () => {
      const mockRow = {
        log_id: 1,
        user_id: 100,
        user_name: 'Test User',
        user_email: 'user@example.com',
        user_team_id: 10,
        clock_in: '2025-03-10T09:00:00Z',
        clock_out: null,
        duration_minutes: null,
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
        created_at: '2025-03-10T09:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.getOpenLog(100);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('clock_out IS NULL'),
        [100],
      );
      expect(result).toBeDefined();
      expect(result?.logId).toBe(1);
      expect(result?.clockOut).toBeNull();
    });

    it('returns null when no open log exists', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await repository.getOpenLog(100);

      expect(result).toBeNull();
    });
  });

  describe('insertClockIn', () => {
    it('inserts clock-in record and returns mapped result', async () => {
      const mockRow = {
        log_id: 123,
        user_id: 100,
        user_name: 'Test User',
        user_email: 'user@example.com',
        user_team_id: 10,
        clock_in: '2025-03-10T09:00:00Z',
        clock_out: null,
        duration_minutes: null,
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
        created_at: '2025-03-10T09:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.insertClockIn({
        userId: 100,
        userEmail: 'user@example.com',
        userName: 'Test User',
        userTeamId: 10,
        clockIn: '2025-03-10T09:00:00Z',
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO attendance_logs'),
        expect.arrayContaining([100, 'user@example.com', 'Test User', 10, '2025-03-10T09:00:00Z']),
      );
      expect(result.logId).toBe(123);
      expect(result.clockOut).toBeNull();
    });

    it('handles null latitude and longitude', async () => {
      const mockRow = {
        log_id: 123,
        user_id: 100,
        user_name: 'Test User',
        user_email: 'user@example.com',
        user_team_id: 10,
        clock_in: '2025-03-10T09:00:00Z',
        clock_out: null,
        duration_minutes: null,
        latitude: null,
        longitude: null,
        source: 'web',
        created_at: '2025-03-10T09:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.insertClockIn({
        userId: 100,
        userEmail: 'user@example.com',
        userName: 'Test User',
        userTeamId: 10,
        clockIn: '2025-03-10T09:00:00Z',
        latitude: undefined,
        longitude: undefined,
        source: 'web',
      });

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('updateClockOut', () => {
    it('updates clock-out and duration', async () => {
      const mockRow = {
        log_id: 1,
        user_id: 100,
        user_name: 'Test User',
        user_email: 'user@example.com',
        user_team_id: 10,
        clock_in: '2025-03-10T09:00:00Z',
        clock_out: '2025-03-10T17:00:00Z',
        duration_minutes: 480,
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
        created_at: '2025-03-10T09:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.updateClockOut({
        logId: 1,
        userId: 100,
        clockOut: '2025-03-10T17:00:00Z',
        durationMinutes: 480,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE attendance_logs'),
        ['2025-03-10T17:00:00Z', 480, 1, 100],
      );
      expect(result.clockOut).toBe('2025-03-10T17:00:00Z');
      expect(result.durationMinutes).toBe(480);
    });
  });

  describe('closeOpenSessionWithTransaction', () => {
    it('closes open session within transaction', async () => {
      const mockOpenRow = {
        log_id: 1,
        user_id: 100,
        user_name: 'Test User',
        user_email: 'user@example.com',
        user_team_id: 10,
        clock_in: '2025-03-10T09:00:00Z',
        clock_out: null,
        duration_minutes: null,
        latitude: -37.8136,
        longitude: 144.9631,
        source: 'mobile',
        created_at: '2025-03-10T09:00:00Z',
      };

      const mockUpdatedRow = {
        ...mockOpenRow,
        clock_out: '2025-03-10T17:00:00Z',
        duration_minutes: 480,
      };

      const mockClient = {
        query: jest.fn(),
      } as any;

      mockWithTransaction.mockImplementation(async (callback) => {
        mockClient.query
          .mockResolvedValueOnce({ rows: [mockOpenRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [mockUpdatedRow], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await repository.closeOpenSessionWithTransaction(100, {
        clockOut: '2025-03-10T17:00:00Z',
        durationMinutes: 480,
      });

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result.clockOut).toBe('2025-03-10T17:00:00Z');
      expect(result.durationMinutes).toBe(480);
    });
  });
});

