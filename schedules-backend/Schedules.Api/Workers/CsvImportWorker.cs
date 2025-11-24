using Microsoft.EntityFrameworkCore;
using Schedules.Api.Data;
using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Workers;

public class CsvImportWorker(AppDbContext dbContext, ILogger<CsvImportWorker> logger)
{
    public async Task ProcessAsync(Guid jobId, CancellationToken token)
    {
        var job = await dbContext.ImportJobs.FirstOrDefaultAsync(j => j.JobId == jobId, token);
        if (job is null)
        {
            logger.LogWarning("Import job {JobId} not found during processing.", jobId);
            return;
        }

        job.Status = ImportJobStatus.Processing;
        await dbContext.SaveChangesAsync(token);

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(1), token); // simulate processing
            job.SuccessRows = job.TotalRows;
            job.Status = ImportJobStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Import job {JobId} failed.", jobId);
            job.Status = ImportJobStatus.Failed;
            job.ErrorDetails = $"\"message\":\"{ex.Message}\"";
            job.CompletedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(token);
    }
}

