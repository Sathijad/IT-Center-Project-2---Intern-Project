using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Contracts.Imports;

public record ImportJobDto(
    Guid JobId,
    string JobType,
    ImportJobStatus Status,
    int TotalRows,
    int SuccessRows,
    int FailureRows,
    string? ErrorDetails,
    long InitiatedBy,
    string StorageUrl,
    DateTime CreatedAt,
    DateTime? CompletedAt);

