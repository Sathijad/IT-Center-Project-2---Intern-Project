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

        var tomorrow = DateTimeOffset.UtcNow.Date.AddDays(1);
        var dueTasks = await dbContext.Tasks
            .Where(t => t.DueDate >= tomorrow && t.DueDate < tomorrow.AddDays(1))
            .ToListAsync(cancellationToken);

        foreach (var task in dueTasks)
        {
            logger.LogInformation("Sending reminder for task {TaskId}", task.TaskItemId);
            await graphClient.SendTaskNotificationAsync(task, cancellationToken);
        }
    }
}

