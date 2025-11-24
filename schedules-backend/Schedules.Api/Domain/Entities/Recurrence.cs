namespace Schedules.Api.Domain.Entities;

public class Recurrence
{
    public Guid RecurrenceId { get; set; }
    public string Pattern { get; set; } = "WEEKLY";
    public short Interval { get; set; } = 1;
    public string? ByDay { get; set; }
    public short? BySetPosition { get; set; }
    public DateOnly? RepeatUntil { get; set; }
    public string Timezone { get; set; } = "UTC";
    public DateTime CreatedAt { get; set; }

    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
}

