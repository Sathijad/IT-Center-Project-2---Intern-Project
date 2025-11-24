namespace Schedules.Domain.Entities;

public class RecurrencePattern
{
    public Guid RecurrencePatternId { get; set; }
    public string Pattern { get; set; } = default!;
    public int Interval { get; set; } = 1;
    public string? ByDay { get; set; }
    public string? ByMonthDay { get; set; }
    public DateTimeOffset? Until { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
}

