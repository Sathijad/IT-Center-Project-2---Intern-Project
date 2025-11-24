namespace Schedules.Domain.Entities;

public class TaskNote
{
    public Guid TaskNoteId { get; set; }
    public Guid TaskItemId { get; set; }
    public TaskItem Task { get; set; } = default!;
    public long AuthorId { get; set; }
    public string Body { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

