import { ReportService } from './reportService';
import { ForbiddenError } from '../common/errors';
import type { AuthenticatedUser } from '../common/types';

class FakeReportRepository {
  getLeaveSummary = jest.fn();
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

describe('ReportService', () => {
  let repository: FakeReportRepository;
  let service: ReportService;

  beforeEach(() => {
    repository = new FakeReportRepository();
    service = new ReportService(repository as any);
  });

  describe('getLeaveSummary', () => {
    const mockSummary = [
      {
        userId: 1,
        email: 'user@example.com',
        policyId: 1,
        policyName: 'Annual Leave',
        totalDays: 20,
        usedDays: 5,
        balanceDays: 15,
      },
    ];

    it('allows admin to access leave summary', async () => {
      const admin = makeUser({ roles: ['ADMIN'] });
      repository.getLeaveSummary.mockResolvedValue(mockSummary);

      const result = await service.getLeaveSummary(admin, { from: '2025-01-01', to: '2025-12-31' });

      expect(repository.getLeaveSummary).toHaveBeenCalledWith({ from: '2025-01-01', to: '2025-12-31' });
      expect(result).toEqual(mockSummary);
    });

    it('throws ForbiddenError when non-admin tries to access', async () => {
      const employee = makeUser({ roles: ['EMPLOYEE'] });

      await expect(service.getLeaveSummary(employee, { from: '2025-01-01' })).rejects.toBeInstanceOf(
        ForbiddenError,
      );

      expect(repository.getLeaveSummary).not.toHaveBeenCalled();
    });

    it('passes filters to repository', async () => {
      const admin = makeUser({ roles: ['ADMIN'] });
      repository.getLeaveSummary.mockResolvedValue(mockSummary);

      await service.getLeaveSummary(admin, {
        from: '2025-01-01',
        to: '2025-12-31',
        teamId: 10,
      });

      expect(repository.getLeaveSummary).toHaveBeenCalledWith({
        from: '2025-01-01',
        to: '2025-12-31',
        teamId: 10,
      });
    });
  });
});

