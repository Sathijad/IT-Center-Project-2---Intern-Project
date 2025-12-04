using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class MetricsService(PerformanceDbContext dbContext) : IMetricsService
{
    public async Task<IReadOnlyCollection<MetricsSnapshotResponse>> GetSnapshotAsync(
        MetricsQuery query,
        CancellationToken cancellationToken)
    {
        var kpiQuery = dbContext.Kpis.AsNoTracking().Where(k => k.IsActive);

        if (!string.IsNullOrWhiteSpace(query.KpiCode))
        {
            kpiQuery = kpiQuery.Where(k => k.Code == query.KpiCode);
        }

        var kpis = await kpiQuery.ToListAsync(cancellationToken);
        var results = new List<MetricsSnapshotResponse>();

        foreach (var kpi in kpis)
        {
            var actualsQuery = dbContext.KpiActuals.AsNoTracking()
                .Where(a => a.KpiId == kpi.KpiId);

            if (query.UserId.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.UserId == query.UserId);
            }

            if (query.TeamId.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.TeamId == query.TeamId);
            }

            // Apply date range filter only if both start and end are provided
            // This allows showing latest actual even if outside the range
            // If range is provided, filter; otherwise show the most recent actual regardless of date
            if (query.RangeStart.HasValue && query.RangeEnd.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => 
                    a.MeasuredAt >= query.RangeStart.Value && 
                    a.MeasuredAt <= query.RangeEnd.Value);
            }

            var latestActual = await actualsQuery
                .OrderByDescending(a => a.MeasuredAt)
                .FirstOrDefaultAsync(cancellationToken);
            
            // If no actual found within range, try to get the most recent one regardless of date
            if (latestActual == null && (query.RangeStart.HasValue || query.RangeEnd.HasValue))
            {
                var allActualsQuery = dbContext.KpiActuals.AsNoTracking()
                    .Where(a => a.KpiId == kpi.KpiId);
                
                if (query.UserId.HasValue)
                {
                    allActualsQuery = allActualsQuery.Where(a => a.UserId == query.UserId);
                }
                
                if (query.TeamId.HasValue)
                {
                    allActualsQuery = allActualsQuery.Where(a => a.TeamId == query.TeamId);
                }
                
                latestActual = await allActualsQuery
                    .OrderByDescending(a => a.MeasuredAt)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            // Get target - always try to get the most relevant target
            // Priority: user-specific > team-specific > organization-wide
            Domain.Entities.KpiTarget? currentTarget = null;
            
            if (query.UserId.HasValue)
            {
                // First try user-specific target
                var userTargetQuery = dbContext.KpiTargets.AsNoTracking()
                    .Where(t => t.KpiId == kpi.KpiId && t.UserId == query.UserId);

                currentTarget = await userTargetQuery
                    .OrderByDescending(t => t.PeriodEnd)
                    .FirstOrDefaultAsync(cancellationToken);

                // If no user-specific target, try team-specific (if team filter is also set)
                if (currentTarget == null && query.TeamId.HasValue)
                {
                    var teamTargetQuery = dbContext.KpiTargets.AsNoTracking()
                        .Where(t => t.KpiId == kpi.KpiId && t.TeamId == query.TeamId && t.UserId == null);

                    currentTarget = await teamTargetQuery
                        .OrderByDescending(t => t.PeriodEnd)
                        .FirstOrDefaultAsync(cancellationToken);
                }

                // If still no target, fall back to organization-wide
                if (currentTarget == null)
                {
                    var orgTargetQuery = dbContext.KpiTargets.AsNoTracking()
                        .Where(t => t.KpiId == kpi.KpiId && t.UserId == null && t.TeamId == null);

                    currentTarget = await orgTargetQuery
                        .OrderByDescending(t => t.PeriodEnd)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            }
            else if (query.TeamId.HasValue)
            {
                // Team filter only (no user filter)
                // First try team-specific target
                var teamTargetQuery = dbContext.KpiTargets.AsNoTracking()
                    .Where(t => t.KpiId == kpi.KpiId && t.TeamId == query.TeamId && t.UserId == null);

                currentTarget = await teamTargetQuery
                    .OrderByDescending(t => t.PeriodEnd)
                    .FirstOrDefaultAsync(cancellationToken);

                // If no team-specific target, fall back to organization-wide
                if (currentTarget == null)
                {
                    var orgTargetQuery = dbContext.KpiTargets.AsNoTracking()
                        .Where(t => t.KpiId == kpi.KpiId && t.UserId == null && t.TeamId == null);

                    currentTarget = await orgTargetQuery
                        .OrderByDescending(t => t.PeriodEnd)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            }
            else
            {
                // No user/team filter - get organization-wide target (or any target if org-wide doesn't exist)
                // Priority: organization-wide > any other target
                var orgTargetQuery = dbContext.KpiTargets.AsNoTracking()
                    .Where(t => t.KpiId == kpi.KpiId && t.UserId == null && t.TeamId == null);

                currentTarget = await orgTargetQuery
                    .OrderByDescending(t => t.PeriodEnd)
                    .FirstOrDefaultAsync(cancellationToken);

                // If no org-wide target, get any target for this KPI (for display purposes)
                if (currentTarget == null)
                {
                    var anyTargetQuery = dbContext.KpiTargets.AsNoTracking()
                        .Where(t => t.KpiId == kpi.KpiId);

                    currentTarget = await anyTargetQuery
                        .OrderByDescending(t => t.PeriodEnd)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            }

            var currentValue = latestActual?.Value;
            var targetValue = currentTarget?.TargetValue;
            var variance = currentValue.HasValue && targetValue.HasValue
                ? currentValue.Value - targetValue.Value
                : (decimal?)null;

            // Always include the result - show both actuals and targets when available
            // This ensures that when filtering by user ID, you see targets even if no actuals
            // And when filtering by KPI code, you see actuals even if no targets
            // Only exclude if filtering by user/team AND there's absolutely no data
            bool shouldInclude = true;
            if (query.UserId.HasValue || query.TeamId.HasValue)
            {
                // When filtering by user/team, only show if there's actual data OR target data
                // This prevents showing completely empty rows
                shouldInclude = latestActual != null || currentTarget != null;
            }
            // If no user/team filter, always include (even if both are null, to show the KPI exists)

            if (shouldInclude)
            {
                results.Add(new MetricsSnapshotResponse(
                    kpi.Code,
                    kpi.Name,
                    currentValue,
                    targetValue,
                    variance,
                    kpi.Unit,
                    latestActual?.MeasuredAt
                ));
            }
        }

        return results;
    }

    public async Task<IReadOnlyCollection<MetricsTimeSeriesResponse>> GetTimeSeriesAsync(
        MetricsQuery query,
        CancellationToken cancellationToken)
    {
        var kpiQuery = dbContext.Kpis.AsNoTracking().Where(k => k.IsActive);

        if (!string.IsNullOrWhiteSpace(query.KpiCode))
        {
            kpiQuery = kpiQuery.Where(k => k.Code == query.KpiCode);
        }

        var kpis = await kpiQuery.ToListAsync(cancellationToken);
        var results = new List<MetricsTimeSeriesResponse>();

        foreach (var kpi in kpis)
        {
            var actualsQuery = dbContext.KpiActuals.AsNoTracking()
                .Where(a => a.KpiId == kpi.KpiId);

            if (query.UserId.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.UserId == query.UserId);
            }

            if (query.TeamId.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.TeamId == query.TeamId);
            }

            if (query.RangeStart.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.MeasuredAt >= query.RangeStart);
            }

            if (query.RangeEnd.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.MeasuredAt <= query.RangeEnd);
            }

            var actuals = await actualsQuery
                .OrderBy(a => a.MeasuredAt)
                .ToListAsync(cancellationToken);

            var dataPoints = actuals.Select(a => new TimeSeriesPoint(a.MeasuredAt, a.Value)).ToList();

            results.Add(new MetricsTimeSeriesResponse(
                kpi.Code,
                kpi.Name,
                kpi.Unit,
                dataPoints
            ));
        }

        return results;
    }
}

