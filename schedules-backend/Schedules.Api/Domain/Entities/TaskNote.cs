namespace Schedules.Api.Domain.Entities;

public class TaskNote
{
    public Guid NoteId { get; set; }
    public Guid TaskId { get; set; }
    public long AuthorId { get; set; }
    public string Body { get; set; } = string.Empty;
    public string? Attachments { get; set; }
    public DateTime CreatedAt { get; set; }

    public TaskEntity Task { get; set; } = null!;
}

