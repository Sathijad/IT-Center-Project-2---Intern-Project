using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;

namespace Schedules.Workers;

public class DailyReminderWorker(
    SchedulesDbContext dbContext,
    IMsGraphClient graphClient,
    IOptions<FeatureFlagOptions> featureFlags,
    ILogger<DailyReminderWorker> logger)
{
    private readonly FeatureFlagOptions _flags = featureFlags.Value;

    public async Task SendRemindersAsync(CancellationToken cancellationToken)
    {
        if (!_flags.EnableTaskNotifications)
        {
            return;
        }

        var utcNow = DateTimeOffset.UtcNow;
        var startOfTomorrowUtc = new DateTimeOffset(utcNow.Year, utcNow.Month, utcNow.Day, 0, 0, 0, TimeSpan.Zero)
            .AddDays(1);
        var endOfTomorrowUtc = startOfTomorrowUtc.AddDays(1);

        var dueTasks = await dbContext.Tasks
            .Where(t => t.DueDate >= startOfTomorrowUtc && t.DueDate < endOfTomorrowUtc)
            .ToListAsync(cancellationToken);

        foreach (var task in dueTasks)
        {
            logger.LogInformation("Sending reminder for task {TaskId}", task.TaskItemId);
            await graphClient.SendTaskNotificationAsync(task, cancellationToken);
        }
    }
}

