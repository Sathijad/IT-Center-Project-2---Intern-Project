using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Domain.Entities;

public class ImportJob
{
    public Guid JobId { get; set; }
    public string JobType { get; set; } = "SCHEDULES";
    public ImportJobStatus Status { get; set; } = ImportJobStatus.Pending;
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailureRows { get; set; }
    public string? ErrorDetails { get; set; }
    public long InitiatedBy { get; set; }
    public string StorageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

