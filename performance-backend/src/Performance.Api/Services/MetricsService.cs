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

            if (query.RangeStart.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.MeasuredAt >= query.RangeStart);
            }

            if (query.RangeEnd.HasValue)
            {
                actualsQuery = actualsQuery.Where(a => a.MeasuredAt <= query.RangeEnd);
            }

            var latestActual = await actualsQuery
                .OrderByDescending(a => a.MeasuredAt)
                .FirstOrDefaultAsync(cancellationToken);

            var targetQuery = dbContext.KpiTargets.AsNoTracking()
                .Where(t => t.KpiId == kpi.KpiId);

            if (query.UserId.HasValue)
            {
                targetQuery = targetQuery.Where(t => t.UserId == query.UserId);
            }

            if (query.TeamId.HasValue)
            {
                targetQuery = targetQuery.Where(t => t.TeamId == query.TeamId);
            }

            var currentTarget = await targetQuery
                .OrderByDescending(t => t.PeriodEnd)
                .FirstOrDefaultAsync(cancellationToken);

            var currentValue = latestActual?.Value;
            var targetValue = currentTarget?.TargetValue;
            var variance = currentValue.HasValue && targetValue.HasValue
                ? currentValue.Value - targetValue.Value
                : (decimal?)null;

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

