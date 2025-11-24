using Schedules.Contracts;
using Schedules.Contracts.Schedules;

namespace Schedules.Services.Interfaces;

public interface IScheduleService
{
    Task<PagedResult<ScheduleResponse>> GetAsync(ScheduleQuery query, CancellationToken cancellationToken);
    Task<ScheduleResponse> CreateAsync(CreateScheduleRequest request, long actorId, CancellationToken cancellationToken);
    Task<ScheduleResponse> UpdateAsync(Guid scheduleId, UpdateScheduleRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid scheduleId, CancellationToken cancellationToken);
}

