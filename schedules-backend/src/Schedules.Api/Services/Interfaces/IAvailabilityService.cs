using Schedules.Contracts.Availability;

namespace Schedules.Services.Interfaces;

public interface IAvailabilityService
{
    Task<AvailabilityResponse> GetAsync(long userId, DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken cancellationToken);
}

