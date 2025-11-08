import { ReportRepository, LeaveSummaryFilters } from '../repositories/reportRepository';
import { AuthenticatedUser } from '../common/types';
import { ForbiddenError } from '../common/errors';

export class ReportService {
  constructor(private readonly repository = new ReportRepository()) {}

  async getLeaveSummary(user: AuthenticatedUser, filters: LeaveSummaryFilters) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenError('Only administrators can access leave summary reports');
    }

    return this.repository.getLeaveSummary(filters);
  }
}

