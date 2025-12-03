using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class ImportService(PerformanceDbContext dbContext) : IImportService
{
    public async Task<Guid> CreateImportJobAsync(
        string filePath,
        long requestedBy,
        CancellationToken cancellationToken)
    {
        var job = new ImportJob
        {
            ImportJobId = Guid.NewGuid(),
            JobType = ImportJobType.KpiActuals,
            RequestedBy = requestedBy,
            FilePath = filePath,
            Status = ImportJobStatus.Queued,
            ProcessedCount = 0,
            FailedCount = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.ImportJobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        return job.ImportJobId;
    }

    public async Task<ImportJobResponse> GetImportJobAsync(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var job = await dbContext.ImportJobs.FindAsync([jobId], cancellationToken);
        if (job == null)
        {
            throw new NotFoundException($"Import job {jobId} not found");
        }

        return new ImportJobResponse(
            job.ImportJobId,
            job.JobType,
            job.Status,
            job.ProcessedCount,
            job.FailedCount,
            job.ErrorDetails,
            job.CreatedAt,
            job.StartedAt,
            job.CompletedAt
        );
    }
}

