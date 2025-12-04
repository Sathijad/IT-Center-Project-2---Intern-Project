using Performance.Contracts.Performance;

namespace Performance.Services.Interfaces;

public interface IKpiActualService
{
    Task<KpiActualResponse> CreateAsync(CreateKpiActualRequest request, long actorId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<KpiActualResponse>> GetByUserAsync(long userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<KpiActualResponse>> GetByKpiAsync(Guid kpiId, CancellationToken cancellationToken);
}

