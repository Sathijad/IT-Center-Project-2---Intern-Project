import { LeaveService } from './leaveService';
import { ApplicationError, ForbiddenError, NotFoundError } from '../common/errors';
import type { AuthenticatedUser } from '../common/types';

class FakeLeaveRepository {
  getLeaveBalances = jest.fn();
  getLeavePolicies = jest.fn();
  initializeLeaveBalance = jest.fn();
  hasOverlappingRequest = jest.fn();
  createLeaveRequest = jest.fn();
  getLeaveRequests = jest.fn();
  getLeaveRequestById = jest.fn();
  transitionLeaveRequest = jest.fn();
}

class FakeMsGraphService {
  enqueueCalendarSync = jest.fn();
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

describe('LeaveService', () => {
  let repository: FakeLeaveRepository;
  let graphService: FakeMsGraphService;
  let service: LeaveService;

  beforeEach(() => {
    repository = new FakeLeaveRepository();
    graphService = new FakeMsGraphService();
    service = new LeaveService(repository as any, graphService as any);
  });

  describe('getBalances', () => {
    it('returns existing balances when present', async () => {
      repository.getLeaveBalances.mockResolvedValue([{ policyId: 1, balanceDays: 10 }]);
      const balances = await service.getBalances(1, 2025);
      expect(balances).toEqual([{ policyId: 1, balanceDays: 10 }]);
      expect(repository.getLeavePolicies).not.toHaveBeenCalled();
    });

    it('initializes balances when none exist', async () => {
      repository.getLeaveBalances
        .mockResolvedValueOnce([]) // first call returns empty
        .mockResolvedValueOnce([{ policyId: 1, balanceDays: 15 }]); // second call returns initialized

      repository.getLeavePolicies.mockResolvedValue([
        { policy_id: 1, annual_limit: 15 },
      ]);

      const result = await service.getBalances(1, 2025);

      expect(repository.getLeavePolicies).toHaveBeenCalled();
      expect(repository.initializeLeaveBalance).toHaveBeenCalledWith(1, 1, 15, 2025);
      expect(result).toEqual([{ policyId: 1, balanceDays: 15 }]);
    });
  });

  describe('createRequest', () => {
    const user = makeUser();

    beforeEach(() => {
      repository.getLeavePolicies.mockResolvedValue([
        { policy_id: 1, annual_limit: 10 },
      ]);
      repository.getLeaveBalances.mockResolvedValue([
        { policyId: 1, balanceDays: 10 },
      ]);
      repository.hasOverlappingRequest.mockResolvedValue(false);
      repository.createLeaveRequest.mockResolvedValue({
        requestId: 123,
        userId: user.userId,
        policyId: 1,
        startDate: '2025-03-10',
        endDate: '2025-03-10',
        daysRequested: 1,
        status: 'PENDING',
      });
    });

    it('creates a leave request for valid input', async () => {
      const request = await service.createRequest(user, {
        policyId: 1,
        startDate: '2025-03-10',
        endDate: '2025-03-10',
        reason: 'Vacation',
      });

      expect(repository.createLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.userId,
          policyId: 1,
          startDate: '2025-03-10',
          endDate: '2025-03-10',
          reason: 'Vacation',
        }),
      );
      expect(request.requestId).toBe(123);
    });

    it('throws when policy id is invalid', async () => {
      await expect(
        service.createRequest(user, {
          policyId: Number.NaN,
          startDate: '2025-03-10',
          endDate: '2025-03-10',
        } as any),
      ).rejects.toBeInstanceOf(ApplicationError);
    });

    it('throws when dates are missing', async () => {
      await expect(
        service.createRequest(user, { policyId: 1 } as any),
      ).rejects.toBeInstanceOf(ApplicationError);
    });

    it('throws when balance is insufficient', async () => {
      repository.getLeaveBalances.mockResolvedValueOnce([
        { policyId: 1, balanceDays: 0 },
      ]);

      await expect(
        service.createRequest(user, {
          policyId: 1,
          startDate: '2025-03-10',
          endDate: '2025-03-10',
        }),
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
      });
    });
  });

  describe('updateRequest', () => {
    const baseRequest = {
      requestId: 100,
      userId: 1,
      policyId: 1,
      startDate: '2025-03-10',
      endDate: '2025-03-10',
      daysRequested: 1,
      status: 'PENDING',
    } as const;

    it('throws NotFoundError when request does not exist', async () => {
      repository.getLeaveRequestById.mockResolvedValue(null);

      await expect(
        service.updateRequest(makeUser(), { requestId: 999, action: 'APPROVE' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('allows owner to cancel their own request', async () => {
      repository.getLeaveRequestById.mockResolvedValue({ ...baseRequest });
      repository.hasOverlappingRequest.mockResolvedValue(false);
      repository.transitionLeaveRequest.mockResolvedValue({
        ...baseRequest,
        status: 'CANCELLED',
      });

      const result = await service.updateRequest(makeUser(), {
        requestId: baseRequest.requestId,
        action: 'CANCEL',
      });

      expect(repository.transitionLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: baseRequest.requestId,
          newStatus: 'CANCELLED',
        }),
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('prevents non-admin from approving a request', async () => {
      repository.getLeaveRequestById.mockResolvedValue({ ...baseRequest });

      await expect(
        service.updateRequest(makeUser(), {
          requestId: baseRequest.requestId,
          action: 'APPROVE',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('allows admin to approve when balance is sufficient and no overlap', async () => {
      const admin = makeUser({ roles: ['ADMIN'] });
      repository.getLeaveRequestById.mockResolvedValue({ ...baseRequest });
      repository.getLeaveBalances.mockResolvedValue([
        { policyId: 1, balanceDays: 5 },
      ]);
      repository.hasOverlappingRequest.mockResolvedValue(false);
      repository.transitionLeaveRequest.mockResolvedValue({
        ...baseRequest,
        status: 'APPROVED',
      });

      const result = await service.updateRequest(admin, {
        requestId: baseRequest.requestId,
        action: 'APPROVE',
      });

      expect(result.status).toBe('APPROVED');
      expect(graphService.enqueueCalendarSync).toHaveBeenCalledWith(baseRequest.requestId);
    });
  });
});


