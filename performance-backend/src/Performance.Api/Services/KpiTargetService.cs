using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class KpiTargetService(PerformanceDbContext dbContext) : IKpiTargetService
{
    public async Task<KpiTargetResponse> CreateAsync(
        CreateKpiTargetRequest request,
        long actorId,
        CancellationToken cancellationToken)
    {
        var kpi = await dbContext.Kpis.FindAsync([request.KpiId], cancellationToken);
        if (kpi == null)
        {
            throw new NotFoundException($"KPI {request.KpiId} not found");
        }

        var target = new KpiTarget
        {
            TargetId = Guid.NewGuid(),
            KpiId = request.KpiId,
            UserId = request.UserId,
            TeamId = request.TeamId,
            PeriodType = request.PeriodType,
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            TargetValue = request.TargetValue,
            CreatedBy = actorId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.KpiTargets.Add(target);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(target, kpi);
    }

    public async Task<KpiTargetResponse> UpdateAsync(
        Guid targetId,
        UpdateKpiTargetRequest request,
        CancellationToken cancellationToken)
    {
        var target = await dbContext.KpiTargets
            .Include(t => t.Kpi)
            .FirstOrDefaultAsync(t => t.TargetId == targetId, cancellationToken);

        if (target == null)
        {
            throw new NotFoundException($"Target {targetId} not found");
        }

        if (request.PeriodStart.HasValue)
        {
            target.PeriodStart = request.PeriodStart.Value;
        }

        if (request.PeriodEnd.HasValue)
        {
            target.PeriodEnd = request.PeriodEnd.Value;
        }

        if (request.TargetValue.HasValue)
        {
            target.TargetValue = request.TargetValue.Value;
        }

        target.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(target, target.Kpi!);
    }

    public async Task<IReadOnlyCollection<KpiTargetResponse>> GetByKpiAsync(
        Guid kpiId,
        CancellationToken cancellationToken)
    {
        var targets = await dbContext.KpiTargets
            .Include(t => t.Kpi)
            .Where(t => t.KpiId == kpiId)
            .ToListAsync(cancellationToken);

        return targets.Select(t => MapToResponse(t, t.Kpi!)).ToList();
    }

    private static KpiTargetResponse MapToResponse(KpiTarget target, Domain.Entities.Kpi kpi)
    {
        return new KpiTargetResponse(
            target.TargetId,
            target.KpiId,
            kpi.Code,
            kpi.Name,
            target.UserId,
            target.TeamId,
            target.PeriodType,
            target.PeriodStart,
            target.PeriodEnd,
            target.TargetValue,
            target.CreatedBy,
            target.CreatedAt,
            target.UpdatedAt
        );
    }
}

