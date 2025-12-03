using System.Globalization;
using CsvHelper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Infrastructure.Data;

namespace Performance.Workers;

public class KpiImportWorker(PerformanceDbContext dbContext, ILogger<KpiImportWorker> logger)
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
            
            // Expected CSV format: kpi_code,user_id,measured_at,value
            var rows = csv.GetRecords<KpiActualImportRow>();

            foreach (var row in rows)
            {
                try
                {
                    // Find KPI by code
                    var kpi = await dbContext.Kpis
                        .FirstOrDefaultAsync(k => k.Code == row.KpiCode && k.IsActive, cancellationToken);

                    if (kpi == null)
                    {
                        logger.LogWarning("KPI with code {KpiCode} not found or inactive", row.KpiCode);
                        job.FailedCount += 1;
                        continue;
                    }

                    // Parse measured_at
                    if (!DateTimeOffset.TryParse(row.MeasuredAt, out var measuredAt))
                    {
                        logger.LogWarning("Invalid date format: {MeasuredAt}", row.MeasuredAt);
                        job.FailedCount += 1;
                        continue;
                    }

                    // Parse value
                    if (!decimal.TryParse(row.Value, out var value))
                    {
                        logger.LogWarning("Invalid value format: {Value}", row.Value);
                        job.FailedCount += 1;
                        continue;
                    }

                    var actual = new KpiActual
                    {
                        ActualId = Guid.NewGuid(),
                        KpiId = kpi.KpiId,
                        UserId = row.UserId,
                        MeasuredAt = measuredAt,
                        Value = value,
                        SourceType = KpiSourceType.Import,
                        ImportJobId = jobId,
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    dbContext.KpiActuals.Add(actual);
                    job.ProcessedCount += 1;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error processing row in import job {JobId}", jobId);
                    job.FailedCount += 1;
                }
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

    private sealed record KpiActualImportRow(
        string KpiCode,
        long? UserId,
        string MeasuredAt,
        string Value
    );
}

