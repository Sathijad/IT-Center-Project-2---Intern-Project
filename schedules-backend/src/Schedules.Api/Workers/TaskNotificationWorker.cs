using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;

namespace Schedules.Workers;

public class TaskNotificationWorker(
    SchedulesDbContext dbContext,
    IMsGraphClient graphClient,
    IOptions<FeatureFlagOptions> featureFlags,
    ILogger<TaskNotificationWorker> logger)
{
    private readonly FeatureFlagOptions _flags = featureFlags.Value;

    public async Task NotifyAsync(Guid taskId, CancellationToken cancellationToken)
    {
        if (!_flags.EnableTaskNotifications)
        {
            logger.LogInformation("Task notifications disabled");
            return;
        }

        var task = await dbContext.Tasks.FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);
        if (task is null)
        {
            logger.LogWarning("Task {TaskId} not found for notification", taskId);
            return;
        }

        await graphClient.SendTaskNotificationAsync(task, cancellationToken);
    }
}

