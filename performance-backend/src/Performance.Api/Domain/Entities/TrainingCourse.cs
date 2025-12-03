using Performance.Domain.Enums;

namespace Performance.Domain.Entities;

public class TrainingCourse
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string? Provider { get; set; }
    public TrainingModality Modality { get; set; } = TrainingModality.Online;
    public string? TeamsMeetingUrl { get; set; }
    public string? SharePointUrl { get; set; }
    public string? OneDriveUrl { get; set; }
    public int? DurationMinutes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TrainingAssignment> Assignments { get; set; } = new List<TrainingAssignment>();
}

