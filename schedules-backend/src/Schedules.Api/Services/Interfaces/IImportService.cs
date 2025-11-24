using Schedules.Contracts.Imports;

namespace Schedules.Services.Interfaces;

public interface IImportService
{
    Task<ImportJobResponse> StartScheduleImportAsync(ImportRequest request, long actorId, CancellationToken cancellationToken);
    Task<ImportJobResponse> GetJobAsync(Guid jobId, CancellationToken cancellationToken);
}

