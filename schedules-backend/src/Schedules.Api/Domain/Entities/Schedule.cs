using Schedules.Domain.Enums;

namespace Schedules.Domain.Entities;

public class Schedule
{
    public Guid ScheduleId { get; set; }
    public long UserId { get; set; }
    public long? TeamId { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public bool IsAllDay { get; set; }
    public ScheduleSource Source { get; set; } = ScheduleSource.Internal;
    public string? CalendarEventId { get; set; }
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Confirmed;
    public Guid? RecurrenceId { get; set; }
    public RecurrencePattern? Recurrence { get; set; }
    public long CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}

