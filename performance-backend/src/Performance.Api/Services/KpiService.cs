using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class KpiService(PerformanceDbContext dbContext) : IKpiService
{
    public async Task<KpiResponse> CreateAsync(CreateKpiRequest request, CancellationToken cancellationToken)
    {
        // Check if KPI code already exists
        var existing = await dbContext.Kpis
            .FirstOrDefaultAsync(k => k.Code == request.Code, cancellationToken);

        if (existing != null)
        {
            throw new ConflictException($"KPI with code '{request.Code}' already exists");
        }

        var kpi = new Kpi
        {
            KpiId = Guid.NewGuid(),
            Code = request.Code,
            Name = request.Name,
            Description = request.Description,
            Unit = request.Unit,
            Category = request.Category,
            CalculationHint = request.CalculationHint,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Kpis.Add(kpi);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(kpi);
    }

    public async Task<IReadOnlyCollection<KpiResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var kpis = await dbContext.Kpis
            .AsNoTracking()
            .Where(k => k.IsActive)
            .OrderBy(k => k.Code)
            .ToListAsync(cancellationToken);

        return kpis.Select(MapToResponse).ToList();
    }

    public async Task<KpiResponse?> GetByCodeAsync(string code, CancellationToken cancellationToken)
    {
        var kpi = await dbContext.Kpis
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.Code == code && k.IsActive, cancellationToken);

        return kpi == null ? null : MapToResponse(kpi);
    }

    public async Task<KpiResponse?> GetByIdAsync(Guid kpiId, CancellationToken cancellationToken)
    {
        var kpi = await dbContext.Kpis
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.KpiId == kpiId, cancellationToken);

        return kpi == null ? null : MapToResponse(kpi);
    }

    private static KpiResponse MapToResponse(Kpi kpi)
    {
        return new KpiResponse(
            kpi.KpiId,
            kpi.Code,
            kpi.Name,
            kpi.Description,
            kpi.Unit,
            kpi.Category,
            kpi.CalculationHint,
            kpi.IsActive,
            kpi.CreatedAt,
            kpi.UpdatedAt
        );
    }
}


