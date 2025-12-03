using Performance.Domain.Enums;

namespace Performance.Contracts.Training;

public record CourseQuery(
    string? Query,
    int Page = 1,
    int Size = 20
);

public record CourseResponse(
    Guid CourseId,
    string Title,
    string? Description,
    string? Provider,
    TrainingModality Modality,
    string? TeamsMeetingUrl,
    string? SharePointUrl,
    string? OneDriveUrl,
    int? DurationMinutes,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CreateCourseRequest(
    string Title,
    string? Description,
    string? Provider,
    TrainingModality Modality,
    string? TeamsMeetingUrl,
    string? SharePointUrl,
    string? OneDriveUrl,
    int? DurationMinutes
);

public record UpdateCourseRequest(
    string? Title,
    string? Description,
    string? Provider,
    TrainingModality? Modality,
    string? TeamsMeetingUrl,
    string? SharePointUrl,
    string? OneDriveUrl,
    int? DurationMinutes,
    bool? IsActive
);

