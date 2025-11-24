using Microsoft.EntityFrameworkCore;
using Schedules.Api.Data;
using TaskStatusEnum = Schedules.Api.Domain.Enums.TaskStatus;
using Schedules.Api.Integrations;

namespace Schedules.Api.Workers;

public class ReminderWorker(AppDbContext dbContext, ITeamsNotifier notifier, ILogger<ReminderWorker> logger)
{
    public async Task SendDueTaskRemindersAsync(CancellationToken token)
    {
        var threshold = DateTime.UtcNow.AddDays(1);
        var tasks = await dbContext.Tasks
            .Where(t => t.Status != TaskStatusEnum.Done && t.DueDate <= threshold)
            .Select(t => new { t.TaskId, t.AssigneeId })
            .ToListAsync(token);

        foreach (var task in tasks)
        {
            await notifier.SendTaskAssignedAsync(task.TaskId, task.AssigneeId, token);
        }

        logger.LogInformation("Queued {Count} reminder notifications", tasks.Count);
    }
}

