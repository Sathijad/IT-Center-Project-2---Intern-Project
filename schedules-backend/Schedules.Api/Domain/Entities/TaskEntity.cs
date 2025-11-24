using TaskPriority = Schedules.Api.Domain.Enums.TaskPriority;
using TaskStatusEnum = Schedules.Api.Domain.Enums.TaskStatus;

namespace Schedules.Api.Domain.Entities;

public class TaskEntity
{
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public TaskStatusEnum Status { get; set; } = TaskStatusEnum.Pending;
    public DateTime? DueDate { get; set; }
    public long AssigneeId { get; set; }
    public long ReporterId { get; set; }
    public Guid? ScheduleId { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Schedule? Schedule { get; set; }
    public ICollection<TaskNote> Notes { get; set; } = new List<TaskNote>();
}

