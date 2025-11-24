using Schedules.Contracts.Availability;
using Schedules.Domain.Entities;
using ScheduleEntity = Schedules.Domain.Entities.Schedule;

namespace Schedules.Integrations;

public interface IMsGraphClient
{
    Task<IReadOnlyCollection<AvailabilitySlot>> GetAvailabilityAsync(string userPrincipalName, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken);
    Task<string?> UpsertScheduleAsync(ScheduleEntity schedule, CancellationToken cancellationToken);
    Task SendTaskNotificationAsync(TaskItem task, CancellationToken cancellationToken);
}

