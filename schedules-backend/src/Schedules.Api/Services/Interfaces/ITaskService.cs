using Schedules.Contracts;
using Schedules.Contracts.Tasks;

namespace Schedules.Services.Interfaces;

public interface ITaskService
{
    Task<PagedResult<TaskResponse>> GetAsync(TaskQuery query, CancellationToken cancellationToken);
    Task<TaskResponse> CreateAsync(CreateTaskRequest request, long actorId, CancellationToken cancellationToken);
    Task<TaskResponse> UpdateAsync(Guid taskId, UpdateTaskRequest request, CancellationToken cancellationToken);
    Task<TaskResponse> AddNoteAsync(Guid taskId, CreateTaskNoteRequest request, long actorId, CancellationToken cancellationToken);
}

