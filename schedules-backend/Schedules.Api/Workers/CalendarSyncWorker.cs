using Microsoft.EntityFrameworkCore;
using Schedules.Api.Data;
using Schedules.Api.Integrations;

namespace Schedules.Api.Workers;

public class CalendarSyncWorker(AppDbContext dbContext, IMsGraphClient graphClient, ILogger<CalendarSyncWorker> logger)
{
    public async Task SyncUpcomingSchedulesAsync(CancellationToken token)
    {
        var windowStart = DateTime.UtcNow;
        var windowEnd = windowStart.AddDays(7);
        var schedules = await dbContext.Schedules
            .Where(s => s.StartTime >= windowStart && s.StartTime <= windowEnd)
            .Select(s => new { s.UserId, Range = $"{s.StartTime:o}/{s.EndTime:o}" })
            .ToListAsync(token);

        foreach (var schedule in schedules)
        {
            await graphClient.TriggerSyncAsync(schedule.UserId, schedule.Range, token);
        }

        logger.LogInformation("Synced {Count} schedules to MS Graph", schedules.Count);
    }
}

