using System.Globalization;
using CsvHelper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using Schedules.Infrastructure.Data;

namespace Schedules.Workers;

public class ScheduleImportWorker(SchedulesDbContext dbContext, ILogger<ScheduleImportWorker> logger)
{
    public async Task ProcessAsync(Guid jobId, CancellationToken cancellationToken)
    {
        var job = await dbContext.ImportJobs.FirstOrDefaultAsync(x => x.ImportJobId == jobId, cancellationToken);
        if (job is null)
        {
            logger.LogWarning("Import job {JobId} not found", jobId);
            return;
        }

        job.Status = ImportJobStatus.Running;
        job.StartedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await using var stream = File.OpenRead(job.FilePath);
            using var reader = new StreamReader(stream);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            var rows = csv.GetRecords<ScheduleImportRow>();

            foreach (var row in rows)
            {
                var start = DateTimeOffset.Parse(row.StartTime);
                var end = DateTimeOffset.Parse(row.EndTime);

                if (await HasConflict(row.UserId, start, end, cancellationToken))
                {
                    job.FailedCount += 1;
                    continue;
                }

                var schedule = new Schedule
                {
                    ScheduleId = Guid.NewGuid(),
                    UserId = row.UserId,
                    TeamId = row.TeamId,
                    Title = row.Title,
                    Description = row.Description,
                    StartTime = start,
                    EndTime = end,
                    Status = ScheduleStatus.Confirmed,
                    Source = ScheduleSource.Import,
                    CreatedBy = job.RequestedBy,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                dbContext.Schedules.Add(schedule);
                job.ProcessedCount += 1;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            job.Status = ImportJobStatus.Succeeded;
            job.CompletedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process import job {JobId}", jobId);
            job.Status = ImportJobStatus.Failed;
            job.ErrorDetails = ex.Message;
            job.CompletedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<bool> HasConflict(long userId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken)
    {
        return await dbContext.Schedules
            .AnyAsync(s => s.UserId == userId && s.StartTime < end && start < s.EndTime, cancellationToken);
    }

    private sealed record ScheduleImportRow(long UserId, long? TeamId, string Title, string? Description, string StartTime, string EndTime);
}

