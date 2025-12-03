using Performance.Domain.Enums;

namespace Performance.Contracts.Performance;

public record ImportJobResponse(
    Guid JobId,
    ImportJobType JobType,
    ImportJobStatus Status,
    int ProcessedCount,
    int FailedCount,
    string? ErrorDetails,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt
);

