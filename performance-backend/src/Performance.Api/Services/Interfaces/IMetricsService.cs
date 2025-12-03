using Performance.Contracts;
using Performance.Contracts.Performance;

namespace Performance.Services.Interfaces;

public interface IMetricsService
{
    Task<IReadOnlyCollection<MetricsSnapshotResponse>> GetSnapshotAsync(MetricsQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<MetricsTimeSeriesResponse>> GetTimeSeriesAsync(MetricsQuery query, CancellationToken cancellationToken);
}

