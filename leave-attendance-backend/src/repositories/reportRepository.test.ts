import { ReportRepository } from './reportRepository';
import * as db from '../common/db';

// Mock the database module
jest.mock('../common/db', () => ({
  query: jest.fn(),
}));

describe('ReportRepository', () => {
  let repository: ReportRepository;
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

  beforeEach(() => {
    repository = new ReportRepository();
    jest.clearAllMocks();
  });

  describe('getLeaveSummary', () => {
    it('returns leave summary with policies and totals', async () => {
      const mockRows = [
        {
          policy_id: 1,
          policy_name: 'Annual Leave',
          total_requests: 10,
          pending: 2,
          approved: 6,
          rejected: 1,
          cancelled: 1,
          approved_days: 30.5,
        },
        {
          policy_id: 2,
          policy_name: 'Sick Leave',
          total_requests: 5,
          pending: 1,
          approved: 3,
          rejected: 0,
          cancelled: 1,
          approved_days: 8,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.getLeaveSummary({
        from: '2025-01-01',
        to: '2025-12-31',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM leave_requests'),
        ['2025-01-01', '2025-12-31'],
      );
      expect(result.policies).toHaveLength(2);
      expect(result.policies[0]).toEqual({
        policyId: 1,
        policyName: 'Annual Leave',
        totalRequests: 10,
        pending: 2,
        approved: 6,
        rejected: 1,
        cancelled: 1,
        approvedDays: 30.5,
      });
      expect(result.totals).toEqual({
        totalRequests: 15,
        pending: 3,
        approved: 9,
        rejected: 1,
        cancelled: 2,
        approvedDays: 38.5,
      });
      expect(result.range).toEqual({
        from: '2025-01-01',
        to: '2025-12-31',
      });
    });

    it('filters by teamId when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await repository.getLeaveSummary({
        teamId: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('user_team_id = $');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [10],
      );
    });

    it('filters by date range when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await repository.getLeaveSummary({
        from: '2025-01-01',
        to: '2025-12-31',
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('start_date >=');
      expect(queryCall).toContain('end_date <=');
    });

    it('returns empty summary when no data', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await repository.getLeaveSummary({});

      expect(result.policies).toEqual([]);
      expect(result.totals).toEqual({
        totalRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        approvedDays: 0,
      });
    });

    it('combines all filters correctly', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await repository.getLeaveSummary({
        from: '2025-01-01',
        to: '2025-12-31',
        teamId: 10,
      });

      const queryCall = mockQuery.mock.calls[0][0] as string;
      expect(queryCall).toContain('start_date >=');
      expect(queryCall).toContain('end_date <=');
      expect(queryCall).toContain('user_team_id =');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['2025-01-01', '2025-12-31', 10],
      );
    });
  });
});

