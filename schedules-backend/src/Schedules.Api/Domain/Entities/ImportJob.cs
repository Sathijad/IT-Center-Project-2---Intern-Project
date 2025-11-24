using Schedules.Domain.Enums;

namespace Schedules.Domain.Entities;

public class ImportJob
{
    public Guid ImportJobId { get; set; }
    public ImportJobType JobType { get; set; } = ImportJobType.Schedules;
    public long RequestedBy { get; set; }
    public string FilePath { get; set; } = default!;
    public ImportJobStatus Status { get; set; } = ImportJobStatus.Queued;
    public string? ErrorDetails { get; set; }
    public int ProcessedCount { get; set; }
    public int FailedCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

