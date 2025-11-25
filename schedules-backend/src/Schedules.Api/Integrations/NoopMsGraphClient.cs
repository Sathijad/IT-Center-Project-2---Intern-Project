using Schedules.Contracts.Availability;
using Schedules.Domain.Entities;

namespace Schedules.Integrations;

/// <summary>
/// Safe fallback when Microsoft Graph credentials are not configured.
/// Prevents schedule creation from failing locally.
/// </summary>
public class NoopMsGraphClient : IMsGraphClient
{
    public Task<IReadOnlyCollection<AvailabilitySlot>> GetAvailabilityAsync(string userPrincipalName, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyCollection<AvailabilitySlot>>(Array.Empty<AvailabilitySlot>());
    }

    public Task<string?> UpsertScheduleAsync(Schedule schedule, CancellationToken cancellationToken)
    {
        return Task.FromResult<string?>(null);
    }

    public Task SendTaskNotificationAsync(TaskItem task, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

