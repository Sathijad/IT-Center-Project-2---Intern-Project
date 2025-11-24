using Schedules.Api.Contracts.Availability;
using Schedules.Api.Integrations;

namespace Schedules.Api.Services;

public interface IAvailabilityService
{
    Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAsync(long userId, string range, CancellationToken token);
    Task TriggerSyncAsync(long userId, string range, CancellationToken token);
}

public class AvailabilityService(IMsGraphClient graphClient, IFeatureFlagService flagService) : IAvailabilityService
{
    public async Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAsync(long userId, string range, CancellationToken token)
    {
        if (!flagService.IsMsGraphSyncEnabled())
        {
            return Array.Empty<AvailabilitySlotDto>();
        }

        return await graphClient.GetAvailabilityAsync(userId, range, token);
    }

    public async Task TriggerSyncAsync(long userId, string range, CancellationToken token)
    {
        if (!flagService.IsMsGraphSyncEnabled())
        {
            return;
        }

        await graphClient.TriggerSyncAsync(userId, range, token);
    }
}

