using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
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
        job.ProcessedCount = 0;
        job.FailedCount = 0;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await using var stream = File.OpenRead(job.FilePath);
            using var reader = new StreamReader(stream);
            var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null, // Don't validate headers strictly
                MissingFieldFound = null // Don't fail on missing fields
            };
            using var csv = new CsvReader(reader, csvConfig);
            
            // Map CSV columns (lowercase with underscores) to record properties (PascalCase)
            csv.Context.RegisterClassMap<KpiActualImportRowMap>();
            
            // Expected CSV format: kpi_code,user_id,measured_at,value
            var rows = csv.GetRecords<KpiActualImportRow>().ToList();

            int processedCount = 0;
            int failedCount = 0;

            foreach (var row in rows)
            {
                try
                {
                    // Find or create KPI by code
                    var kpi = await dbContext.Kpis
                        .FirstOrDefaultAsync(k => k.Code == row.KpiCode && k.IsActive, cancellationToken);

                    if (kpi == null)
                    {
                        // Auto-create KPI with default values
                        logger.LogInformation("Auto-creating KPI with code {KpiCode}", row.KpiCode);
                        kpi = new Kpi
                        {
                            KpiId = Guid.NewGuid(),
                            Code = row.KpiCode,
                            Name = FormatKpiName(row.KpiCode),
                            Description = $"Auto-created KPI: {row.KpiCode}. Please update description as needed.",
                            Unit = InferUnit(row.KpiCode),
                            Category = InferCategory(row.KpiCode),
                            IsActive = true,
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                        
                        dbContext.Kpis.Add(kpi);
                        await dbContext.SaveChangesAsync(cancellationToken);
                        
                        logger.LogInformation("Created KPI {KpiCode} with ID {KpiId}", row.KpiCode, kpi.KpiId);
                    }

                    // Parse measured_at
                    if (!DateTimeOffset.TryParse(row.MeasuredAt, out var measuredAt))
                    {
                        logger.LogWarning("Invalid date format: {MeasuredAt}", row.MeasuredAt);
                        failedCount += 1;
                        continue;
                    }

                    // Parse value
                    if (!decimal.TryParse(row.Value, out var value))
                    {
                        logger.LogWarning("Invalid value format: {Value}", row.Value);
                        failedCount += 1;
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
                    processedCount += 1;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error processing row in import job {JobId}", jobId);
                    failedCount += 1;
                }
            }

            // Save all actuals first
            await dbContext.SaveChangesAsync(cancellationToken);

            // Update job counters and status
            job.ProcessedCount = processedCount;
            job.FailedCount = failedCount;
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

    private sealed class KpiActualImportRow
    {
        public string KpiCode { get; set; } = string.Empty;
        public long? UserId { get; set; }
        public string MeasuredAt { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    private sealed class KpiActualImportRowMap : ClassMap<KpiActualImportRow>
    {
        public KpiActualImportRowMap()
        {
            Map(m => m.KpiCode).Name("kpi_code");
            Map(m => m.UserId).Name("user_id").Optional();
            Map(m => m.MeasuredAt).Name("measured_at");
            Map(m => m.Value).Name("value");
        }
    }

    private static string FormatKpiName(string code)
    {
        // Convert "TICKET_RESOLUTION_TIME" to "Ticket Resolution Time"
        if (string.IsNullOrWhiteSpace(code))
            return code;
            
        return string.Join(" ", code.Split('_', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => word.Length > 0 
                ? char.ToUpper(word[0]) + word.Substring(1).ToLowerInvariant() 
                : word));
    }

    private static string? InferUnit(string code)
    {
        // Try to infer unit from KPI code
        if (string.IsNullOrWhiteSpace(code))
            return null;
            
        var upperCode = code.ToUpperInvariant();
        
        if (upperCode.Contains("TIME") || upperCode.Contains("DURATION") || upperCode.Contains("FULFILLMENT"))
            return "Hours";
        if (upperCode.Contains("RESPONSE") && !upperCode.Contains("TIME"))
            return "Minutes";
        if (upperCode.Contains("PERCENTAGE") || upperCode.Contains("RATE") || upperCode.Contains("UPTIME") || 
            upperCode.Contains("COMPLIANCE") || upperCode.Contains("UTILIZATION"))
            return "Percentage";
        if (upperCode.Contains("COUNT") || upperCode.Contains("INCIDENTS") || upperCode.Contains("TICKETS") || 
            upperCode.Contains("BACKLOG") || upperCode.Contains("RESOLVED"))
            return "Count";
        if (upperCode.Contains("SATISFACTION") || upperCode.Contains("SCORE"))
            return "Score";
        if (upperCode.Contains("RECOVERY"))
            return "Minutes";
            
        return null; // Unknown, let user update later
    }

    private static string? InferCategory(string code)
    {
        // Try to infer category from KPI code
        if (string.IsNullOrWhiteSpace(code))
            return "General";
            
        var upperCode = code.ToUpperInvariant();
        
        if (upperCode.Contains("TICKET") || upperCode.Contains("RESPONSE") || upperCode.Contains("RESOLUTION") ||
            upperCode.Contains("BACKLOG") || upperCode.Contains("RESOLVED"))
            return "Service Desk";
        if (upperCode.Contains("UPTIME") || upperCode.Contains("UTILIZATION") || upperCode.Contains("RECOVERY") || 
            upperCode.Contains("INFRASTRUCTURE") || upperCode.Contains("MEAN_TIME"))
            return "System Availability";
        if (upperCode.Contains("SECURITY") || upperCode.Contains("PATCH") || upperCode.Contains("VULNERABILITY") ||
            upperCode.Contains("INCIDENTS") && upperCode.Contains("SECURITY"))
            return "Security";
        if (upperCode.Contains("CHANGE") && (upperCode.Contains("SUCCESS") || upperCode.Contains("RATE")))
            return "Change Management";
        if (upperCode.Contains("SATISFACTION") || (upperCode.Contains("SERVICE") && upperCode.Contains("REQUEST")))
            return "Customer Satisfaction";
        if (upperCode.Contains("TRAINING") || upperCode.Contains("CERTIFICATION"))
            return "Training & Development";
            
        return "General"; // Default category
    }
}

