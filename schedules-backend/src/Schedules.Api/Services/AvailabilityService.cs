using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Contracts.Availability;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;
using Schedules.Services.Interfaces;

namespace Schedules.Services;

public class AvailabilityService(
    SchedulesDbContext dbContext,
    IUserDirectory userDirectory,
    IMsGraphClient graphClient,
    IOptions<FeatureFlagOptions> featureFlags) : IAvailabilityService
{
    private readonly FeatureFlagOptions _flags = featureFlags.Value;

    public async Task<AvailabilityResponse> GetAsync(long userId, DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken cancellationToken)
    {
        var localBusy = await dbContext.Schedules
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StartTime < rangeEnd && s.EndTime > rangeStart)
            .Select(s => new AvailabilitySlot(s.StartTime, s.EndTime, "LOCAL"))
            .ToListAsync(cancellationToken);

        if (_flags.EnableMsGraphSync)
        {
            var upn = await userDirectory.GetUserPrincipalNameAsync(userId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(upn))
            {
                var remoteBusy = await graphClient.GetAvailabilityAsync(upn, rangeStart, rangeEnd, cancellationToken);
                localBusy.AddRange(remoteBusy);
            }
        }

        return new AvailabilityResponse(userId, localBusy);
    }
}

