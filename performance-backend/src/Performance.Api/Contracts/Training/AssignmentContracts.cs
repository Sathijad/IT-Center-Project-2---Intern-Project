using Performance.Domain.Enums;

namespace Performance.Contracts.Training;

public record AssignTrainingRequest(
    Guid CourseId,
    TrainingAssigneeType AssigneeType,
    long? AssigneeId,
    string? CohortId,
    DateTimeOffset? DueDate
);

public record UpdateAssignmentRequest(
    TrainingAssignmentStatus? Status,
    int? Progress,
    DateTimeOffset? CompletedAt
);

public record AssignmentResponse(
    Guid AssignmentId,
    Guid CourseId,
    string CourseTitle,
    TrainingAssigneeType AssigneeType,
    long? AssigneeId,
    string? CohortId,
    DateTimeOffset? DueDate,
    TrainingAssignmentStatus Status,
    int Progress,
    DateTimeOffset? CompletedAt,
    long AssignedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

