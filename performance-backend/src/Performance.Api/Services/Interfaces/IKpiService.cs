using Performance.Contracts.Performance;

namespace Performance.Services.Interfaces;

public interface IKpiService
{
    Task<KpiResponse> CreateAsync(CreateKpiRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<KpiResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<KpiResponse?> GetByCodeAsync(string code, CancellationToken cancellationToken);
    Task<KpiResponse?> GetByIdAsync(Guid kpiId, CancellationToken cancellationToken);
}


