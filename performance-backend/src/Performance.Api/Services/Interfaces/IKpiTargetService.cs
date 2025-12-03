using Performance.Contracts.Performance;

namespace Performance.Services.Interfaces;

public interface IKpiTargetService
{
    Task<KpiTargetResponse> CreateAsync(CreateKpiTargetRequest request, long actorId, CancellationToken cancellationToken);
    Task<KpiTargetResponse> UpdateAsync(Guid targetId, UpdateKpiTargetRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<KpiTargetResponse>> GetByKpiAsync(Guid kpiId, CancellationToken cancellationToken);
}

