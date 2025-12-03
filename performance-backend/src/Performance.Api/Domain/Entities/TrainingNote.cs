using Performance.Domain.Enums;

namespace Performance.Domain.Entities;

public class TrainingNote
{
    public Guid NoteId { get; set; }
    public Guid AssignmentId { get; set; }
    public TrainingAssignment? Assignment { get; set; }
    public long AuthorId { get; set; }
    public TrainingNoteType NoteType { get; set; } = TrainingNoteType.Note;
    public string Content { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

