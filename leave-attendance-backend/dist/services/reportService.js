"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const reportRepository_1 = require("../repositories/reportRepository");
const errors_1 = require("../common/errors");
class ReportService {
    repository;
    constructor(repository = new reportRepository_1.ReportRepository()) {
        this.repository = repository;
    }
    async getLeaveSummary(user, filters) {
        if (!user.roles.includes('ADMIN')) {
            throw new errors_1.ForbiddenError('Only administrators can access leave summary reports');
        }
        return this.repository.getLeaveSummary(filters);
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=reportService.js.map