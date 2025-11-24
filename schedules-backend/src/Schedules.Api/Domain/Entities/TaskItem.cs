using Schedules.Domain.Enums;
using TaskStatusEnum = Schedules.Domain.Enums.TaskStatus;

namespace Schedules.Domain.Entities;

public class TaskItem
{
    public Guid TaskItemId { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public long AssigneeId { get; set; }
    public Guid? ScheduleId { get; set; }
    public Schedule? Schedule { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public TaskStatusEnum Status { get; set; } = TaskStatusEnum.Pending;
    public DateTimeOffset? DueDate { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();
    public string? MsGraphItemId { get; set; }
    public long CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TaskNote> Notes { get; set; } = new List<TaskNote>();
}

