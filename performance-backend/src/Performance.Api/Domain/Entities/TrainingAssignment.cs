using Performance.Domain.Enums;

namespace Performance.Domain.Entities;

public class TrainingAssignment
{
    public Guid AssignmentId { get; set; }
    public Guid CourseId { get; set; }
    public TrainingCourse? Course { get; set; }
    public TrainingAssigneeType AssigneeType { get; set; } = TrainingAssigneeType.User;
    public long? AssigneeId { get; set; }
    public string? CohortId { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public TrainingAssignmentStatus Status { get; set; } = TrainingAssignmentStatus.Assigned;
    public int Progress { get; set; } = 0;
    public DateTimeOffset? CompletedAt { get; set; }
    public long AssignedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TrainingNote> Notes { get; set; } = new List<TrainingNote>();
}

