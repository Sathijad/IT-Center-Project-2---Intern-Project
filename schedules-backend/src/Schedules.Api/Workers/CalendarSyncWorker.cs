using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;

namespace Schedules.Workers;

public class CalendarSyncWorker(
    SchedulesDbContext dbContext,
    IMsGraphClient graphClient,
    IOptions<FeatureFlagOptions> featureFlags,
    ILogger<CalendarSyncWorker> logger)
{
    private readonly FeatureFlagOptions _flags = featureFlags.Value;

    public async Task PushAsync(Guid scheduleId, CancellationToken cancellationToken)
    {
        if (!_flags.EnableMsGraphSync)
        {
            logger.LogInformation("Graph sync disabled, skipping schedule {ScheduleId}", scheduleId);
            return;
        }

        var schedule = await dbContext.Schedules.FirstOrDefaultAsync(x => x.ScheduleId == scheduleId, cancellationToken);
        if (schedule is null)
        {
            logger.LogWarning("Schedule {ScheduleId} not found for sync", scheduleId);
            return;
        }

        var eventId = await graphClient.UpsertScheduleAsync(schedule, cancellationToken);
        if (!string.IsNullOrEmpty(eventId))
        {
            schedule.CalendarEventId = eventId;
            schedule.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}

