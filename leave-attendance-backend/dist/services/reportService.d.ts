import { ReportRepository, LeaveSummaryFilters } from '../repositories/reportRepository';
import { AuthenticatedUser } from '../common/types';
export declare class ReportService {
    private readonly repository;
    constructor(repository?: ReportRepository);
    getLeaveSummary(user: AuthenticatedUser, filters: LeaveSummaryFilters): Promise<import("../repositories/reportRepository").LeaveSummaryResult>;
}
