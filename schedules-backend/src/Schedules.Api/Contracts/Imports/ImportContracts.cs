namespace Schedules.Contracts.Imports;

public record ImportRequest(string FileName, string Base64Payload, bool DryRun);

public record ImportJobResponse(
    Guid JobId,
    string JobType,
    string Status,
    int ProcessedCount,
    int FailedCount,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string? ErrorDetails);

