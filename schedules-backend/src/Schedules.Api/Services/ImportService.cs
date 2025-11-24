using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Schedules.Contracts.Imports;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using Schedules.Errors;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;
using Schedules.Workers;

namespace Schedules.Services;

public class ImportService(
    IWebHostEnvironment environment,
    SchedulesDbContext dbContext,
    IBackgroundJobClient backgroundJobClient,
    ILogger<ImportService> logger) : IImportService
{
    private readonly string _importDirectory = Path.Combine(environment.ContentRootPath, "imports");

    public async Task<ImportJobResponse> StartScheduleImportAsync(ImportRequest request, long actorId, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_importDirectory);
        var jobId = Guid.NewGuid();
        var filePath = Path.Combine(_importDirectory, $"{jobId}_{request.FileName}");

        var bytes = Convert.FromBase64String(request.Base64Payload);
        await File.WriteAllBytesAsync(filePath, bytes, cancellationToken);

        var job = new ImportJob
        {
            ImportJobId = jobId,
            JobType = ImportJobType.Schedules,
            RequestedBy = actorId,
            FilePath = filePath,
            Status = ImportJobStatus.Queued,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.ImportJobs.Add(job);
        await dbContext.SaveChangesAsync(cancellationToken);

        backgroundJobClient.Enqueue<ScheduleImportWorker>(worker =>
            worker.ProcessAsync(jobId, CancellationToken.None));

        logger.LogInformation("Queued import job {JobId}", jobId);

        return Map(job);
    }

    public async Task<ImportJobResponse> GetJobAsync(Guid jobId, CancellationToken cancellationToken)
    {
        var job = await dbContext.ImportJobs
            .FirstOrDefaultAsync(x => x.ImportJobId == jobId, cancellationToken);

        if (job is null)
        {
            throw new NotFoundException($"Import job {jobId} not found");
        }

        return Map(job);
    }

    private static ImportJobResponse Map(ImportJob job) =>
        new(job.ImportJobId, job.JobType.ToString(), job.Status.ToString(), job.ProcessedCount,
            job.FailedCount, job.StartedAt, job.CompletedAt, job.ErrorDetails);
}

