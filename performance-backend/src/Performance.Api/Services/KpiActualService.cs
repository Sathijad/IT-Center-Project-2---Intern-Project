using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class KpiActualService(PerformanceDbContext dbContext) : IKpiActualService
{
    public async Task<KpiActualResponse> CreateAsync(
        CreateKpiActualRequest request,
        long actorId,
        CancellationToken cancellationToken)
    {
        // Verify KPI exists
        var kpi = await dbContext.Kpis
            .FirstOrDefaultAsync(k => k.KpiId == request.KpiId && k.IsActive, cancellationToken);

        if (kpi == null)
        {
            throw new NotFoundException($"KPI {request.KpiId} not found");
        }

        var actual = new KpiActual
        {
            ActualId = Guid.NewGuid(),
            KpiId = request.KpiId,
            UserId = request.UserId,
            TeamId = request.TeamId,
            MeasuredAt = request.MeasuredAt,
            Value = request.Value,
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            SourceType = KpiSourceType.Manual,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.KpiActuals.Add(actual);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(actual, kpi);
    }

    public async Task<IReadOnlyCollection<KpiActualResponse>> GetByUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var actuals = await dbContext.KpiActuals
            .AsNoTracking()
            .Include(a => a.Kpi)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.MeasuredAt)
            .ToListAsync(cancellationToken);

        return actuals.Select(a => MapToResponse(a, a.Kpi!)).ToList();
    }

    public async Task<IReadOnlyCollection<KpiActualResponse>> GetByKpiAsync(
        Guid kpiId,
        CancellationToken cancellationToken)
    {
        var actuals = await dbContext.KpiActuals
            .AsNoTracking()
            .Include(a => a.Kpi)
            .Where(a => a.KpiId == kpiId)
            .OrderByDescending(a => a.MeasuredAt)
            .ToListAsync(cancellationToken);

        return actuals.Select(a => MapToResponse(a, a.Kpi!)).ToList();
    }

    private static KpiActualResponse MapToResponse(KpiActual actual, Domain.Entities.Kpi kpi)
    {
        return new KpiActualResponse(
            actual.ActualId,
            actual.KpiId,
            kpi.Code,
            kpi.Name,
            actual.UserId,
            actual.TeamId,
            actual.MeasuredAt,
            actual.PeriodStart,
            actual.PeriodEnd,
            actual.Value,
            actual.SourceType.ToString(),
            actual.CreatedAt
        );
    }
}

