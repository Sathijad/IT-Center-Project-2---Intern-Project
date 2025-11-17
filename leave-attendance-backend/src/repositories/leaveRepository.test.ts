import { LeaveRepository } from './leaveRepository';
import * as db from '../common/db';

// Mock the database module
jest.mock('../common/db', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

describe('LeaveRepository', () => {
  let repository: LeaveRepository;
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
  const mockWithTransaction = db.withTransaction as jest.MockedFunction<typeof db.withTransaction>;

  beforeEach(() => {
    repository = new LeaveRepository();
    jest.clearAllMocks();
  });

  describe('getLeaveBalances', () => {
    it('returns mapped leave balances for user and year', async () => {
      const mockRows = [
        {
          balance_id: 1,
          policy_id: 1,
          policy_name: 'Annual Leave',
          balance_days: '15',
          year: 2025,
        },
        {
          balance_id: 2,
          policy_id: 2,
          policy_name: 'Sick Leave',
          balance_days: '10',
          year: 2025,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.getLeaveBalances(100, 2025);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [100, 2025],
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        balanceId: 1,
        policyId: 1,
        policyName: 'Annual Leave',
        balanceDays: 15,
        year: 2025,
      });
      expect(result[1]).toEqual({
        balanceId: 2,
        policyId: 2,
        policyName: 'Sick Leave',
        balanceDays: 10,
        year: 2025,
      });
    });

    it('returns empty array when no balances found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await repository.getLeaveBalances(100, 2025);

      expect(result).toEqual([]);
    });
  });

  describe('getLeavePolicies', () => {
    it('returns active leave policies', async () => {
      const mockRows = [
        { policy_id: 1, name: 'Annual Leave', annual_limit: 20 },
        { policy_id: 2, name: 'Sick Leave', annual_limit: 10 },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.getLeavePolicies();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
      );
      expect(result).toEqual(mockRows);
    });
  });

  describe('initializeLeaveBalance', () => {
    it('inserts leave balance with ON CONFLICT DO NOTHING', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await repository.initializeLeaveBalance(100, 1, 20, 2025);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [100, 1, 20, 2025],
      );
    });
  });

  describe('getLeaveRequests', () => {
    it('returns paginated leave requests with filters', async () => {
      const mockRows = [
        {
          request_id: 1,
          user_id: 100,
          user_email: 'user@example.com',
          user_name: 'Test User',
          user_team_id: 10,
          policy_id: 1,
          policy_name: 'Annual Leave',
          status: 'PENDING',
          start_date: '2025-03-10',
          end_date: '2025-03-12',
          half_day: false,
          reason: 'Vacation',
          graph_event_id: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          days_requested: '3',
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

      const result = await repository.getLeaveRequests({
        userId: 100,
        page: 1,
        size: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        requestId: 1,
        userId: 100,
        userEmail: 'user@example.com',
        userName: 'Test User',
        userTeamId: 10,
        policyId: 1,
        policyName: 'Annual Leave',
        status: 'PENDING',
        startDate: '2025-03-10',
        endDate: '2025-03-12',
        halfDay: false,
        reason: 'Vacation',
        graphEventId: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        daysRequested: 3,
      });
      expect(result.total).toBe(1);
    });

    it('filters by status when provided', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await repository.getLeaveRequests({
        userId: 100,
        status: 'APPROVED',
        page: 1,
        size: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('lr.status = $');
      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params).toContain('APPROVED');
    });

    it('filters by date range when provided', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await repository.getLeaveRequests({
        userId: 100,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        page: 1,
        size: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('start_date >=');
      expect(queryCall).toContain('end_date <=');
    });
  });

  describe('getLeaveRequestById', () => {
    it('returns leave request when found', async () => {
      const mockRow = {
        request_id: 1,
        user_id: 100,
        user_email: 'user@example.com',
        user_name: 'Test User',
        user_team_id: 10,
        policy_id: 1,
        policy_name: 'Annual Leave',
        status: 'PENDING',
        start_date: '2025-03-10',
        end_date: '2025-03-12',
        half_day: false,
        reason: 'Vacation',
        graph_event_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        days_requested: '3',
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.getLeaveRequestById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('request_id = $1'),
        [1],
      );
      expect(result).toBeDefined();
      expect(result?.requestId).toBe(1);
    });

    it('returns null when request not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await repository.getLeaveRequestById(999);

      expect(result).toBeNull();
    });
  });

  describe('hasOverlappingRequest', () => {
    it('returns true when overlapping request exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: 1 }] } as any);

      const result = await repository.hasOverlappingRequest(100, 1, '2025-03-10', '2025-03-12');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining([100, 1, '2025-03-10', '2025-03-12']),
      );
      expect(result).toBe(true);
    });

    it('returns false when no overlapping request', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] } as any);

      const result = await repository.hasOverlappingRequest(100, 1, '2025-03-10', '2025-03-12');

      expect(result).toBe(false);
    });

    it('excludes current request when requestId provided', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] } as any);

      await repository.hasOverlappingRequest(100, 1, '2025-03-10', '2025-03-12', 50);

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('request_id <>');
    });
  });

  describe('createLeaveRequest', () => {
    it('creates leave request and returns mapped result', async () => {
      const mockInsertRow = { request_id: 123 };
      const mockFullRow = {
        request_id: 123,
        user_id: 100,
        user_email: 'user@example.com',
        user_name: 'Test User',
        user_team_id: 10,
        policy_id: 1,
        policy_name: 'Annual Leave',
        status: 'PENDING',
        start_date: '2025-03-10',
        end_date: '2025-03-12',
        half_day: false,
        reason: 'Vacation',
        graph_event_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        days_requested: '3',
      };

      const mockClient = {
        query: jest.fn(),
      } as any;

      mockWithTransaction.mockImplementation(async (callback) => {
        mockClient.query
          .mockResolvedValueOnce({ rows: [mockInsertRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [mockFullRow], rowCount: 1 });
        return callback(mockClient);
      });

      const result = await repository.createLeaveRequest({
        userId: 100,
        userEmail: 'user@example.com',
        userName: 'Test User',
        userTeamId: 10,
        policyId: 1,
        startDate: '2025-03-10',
        endDate: '2025-03-12',
        halfDay: false,
        reason: 'Vacation',
      });

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query.mock.calls[0][0]).toContain('INSERT INTO leave_requests');
      expect(result.requestId).toBe(123);
      expect(result.status).toBe('PENDING');
    });
  });

  describe('transitionLeaveRequest', () => {
    it('updates leave request status and adjusts balance', async () => {
      const mockRow = {
        request_id: 1,
        user_id: 100,
        user_email: 'user@example.com',
        user_name: 'Test User',
        user_team_id: 10,
        policy_id: 1,
        policy_name: 'Annual Leave',
        status: 'APPROVED',
        start_date: '2025-03-10',
        end_date: '2025-03-12',
        half_day: false,
        reason: 'Vacation',
        graph_event_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        days_requested: '3',
      };

      const mockClient = {
        query: jest.fn(),
      } as any;

      mockWithTransaction.mockImplementation(async (callback) => {
        // First query: SELECT existing request (FOR UPDATE)
        // Second query: UPDATE status (RETURNING request_id)
        // Third query: INSERT into leave_audit
        // Fourth query: SELECT full updated request
        // Fifth query: INSERT into leave_balances (adjustLeaveBalance - ON CONFLICT DO NOTHING)
        // Sixth query: UPDATE leave_balances (adjustLeaveBalance)
        mockClient.query
          .mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 }) // SELECT existing
          .mockResolvedValueOnce({ rows: [{ request_id: 1 }], rowCount: 1 }) // UPDATE status
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT audit
          .mockResolvedValueOnce({ rows: [{ ...mockRow, status: 'APPROVED' }], rowCount: 1 }) // SELECT updated
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT leave_balances
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE leave_balances
        return callback(mockClient);
      });

      const result = await repository.transitionLeaveRequest({
        requestId: 1,
        newStatus: 'APPROVED',
        actorId: 200,
        actorEmail: 'admin@example.com',
        actorName: 'Admin',
        notes: 'Approved',
        daysToAdjust: 3,
      });

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(result.status).toBe('APPROVED');
    });
  });
});

