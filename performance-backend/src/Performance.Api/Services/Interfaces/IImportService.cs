using Performance.Contracts.Performance;

namespace Performance.Services.Interfaces;

public interface IImportService
{
    Task<Guid> CreateImportJobAsync(string filePath, long requestedBy, CancellationToken cancellationToken);
    Task<ImportJobResponse> GetImportJobAsync(Guid jobId, CancellationToken cancellationToken);
}

