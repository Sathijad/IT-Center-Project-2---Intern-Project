using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Domain.Entities;

public class Schedule
{
    public Guid ScheduleId { get; set; }
    public long UserId { get; set; }
    public Guid? TeamId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public Guid? RecurrenceId { get; set; }
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Active;
    public ScheduleSource Source { get; set; } = ScheduleSource.Manual;
    public string? Metadata { get; set; }
    public long CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Recurrence? Recurrence { get; set; }
    public ICollection<TaskEntity> Tasks { get; set; } = new List<TaskEntity>();
}

