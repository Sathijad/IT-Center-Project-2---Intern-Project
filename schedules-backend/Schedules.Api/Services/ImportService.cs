using AutoMapper;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Schedules.Api.Contracts.Imports;
using Schedules.Api.Data;
using Schedules.Api.Domain.Entities;
using Schedules.Api.Infrastructure.Exceptions;
using Schedules.Api.Workers;

namespace Schedules.Api.Services;

public interface IImportService
{
    Task<ImportJobDto> StartSchedulesImportAsync(Stream fileStream, string fileName, long actorId, CancellationToken token);
    Task<ImportJobDto> GetJobAsync(Guid jobId, CancellationToken token);
}

public class ImportService(AppDbContext dbContext, IMapper mapper, ILogger<ImportService> logger, IBackgroundJobClient backgroundJobClient, CsvImportWorker worker, IFeatureFlagService featureFlags) : IImportService
{
    public async Task<ImportJobDto> StartSchedulesImportAsync(Stream fileStream, string fileName, long actorId, CancellationToken token)
    {
        if (!featureFlags.IsBulkImportEnabled())
        {
            throw new ApiException("FEATURE_DISABLED", "Bulk import is currently disabled.");
        }

        using var reader = new StreamReader(fileStream);
        var raw = await reader.ReadToEndAsync(token);
        var rows = raw.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        var job = new ImportJob
        {
            JobId = Guid.NewGuid(),
            JobType = "SCHEDULES",
            Status = Domain.Enums.ImportJobStatus.Pending,
            TotalRows = Math.Max(rows.Length - 1, 0),
            InitiatedBy = actorId,
            StorageUrl = $"s3://itcenter-schedules-imports/{DateTime.UtcNow:yyyyMMdd}/{fileName}",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ImportJobs.Add(job);
        await dbContext.SaveChangesAsync(token);

        backgroundJobClient.Enqueue(() => worker.ProcessAsync(job.JobId, CancellationToken.None));
        logger.LogInformation("Import job {JobId} queued by {Actor}", job.JobId, actorId);
        return mapper.Map<ImportJobDto>(job);
    }

    public async Task<ImportJobDto> GetJobAsync(Guid jobId, CancellationToken token)
    {
        var job = await dbContext.ImportJobs.FirstOrDefaultAsync(j => j.JobId == jobId, token)
            ?? throw new NotFoundException($"Import job {jobId} not found");
        return mapper.Map<ImportJobDto>(job);
    }
}

