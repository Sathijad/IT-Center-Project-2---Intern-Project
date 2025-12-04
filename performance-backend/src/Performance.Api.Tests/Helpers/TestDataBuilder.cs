using Performance.Domain.Entities;
using Performance.Domain.Enums;

namespace Performance.Api.Tests.Helpers;

public static class TestDataBuilder
{
    public static Kpi CreateKpi(
        string code = "TEST_KPI",
        string name = "Test KPI",
        string? description = null,
        string? unit = "Count",
        string? category = "Test",
        bool isActive = true)
    {
        return new Kpi
        {
            KpiId = Guid.NewGuid(),
            Code = code,
            Name = name,
            Description = description ?? $"Description for {name}",
            Unit = unit,
            Category = category,
            IsActive = isActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    public static KpiTarget CreateKpiTarget(
        Guid kpiId,
        decimal targetValue = 100m,
        long? userId = null,
        long? teamId = null,
        KpiPeriodType periodType = KpiPeriodType.Monthly,
        DateOnly? periodStart = null,
        DateOnly? periodEnd = null)
    {
        return new KpiTarget
        {
            TargetId = Guid.NewGuid(),
            KpiId = kpiId,
            UserId = userId,
            TeamId = teamId,
            PeriodType = periodType,
            PeriodStart = periodStart ?? DateOnly.FromDateTime(DateTime.UtcNow),
            PeriodEnd = periodEnd ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
            TargetValue = targetValue,
            CreatedBy = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    public static KpiActual CreateKpiActual(
        Guid kpiId,
        decimal value = 95m,
        long? userId = null,
        long? teamId = null,
        DateTimeOffset? measuredAt = null,
        KpiSourceType sourceType = KpiSourceType.Manual)
    {
        return new KpiActual
        {
            ActualId = Guid.NewGuid(),
            KpiId = kpiId,
            UserId = userId,
            TeamId = teamId,
            MeasuredAt = measuredAt ?? DateTimeOffset.UtcNow,
            Value = value,
            SourceType = sourceType,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    public static TrainingCourse CreateTrainingCourse(
        string title = "Test Course",
        string? description = null,
        TrainingModality modality = TrainingModality.Online,
        bool isActive = true)
    {
        return new TrainingCourse
        {
            CourseId = Guid.NewGuid(),
            Title = title,
            Description = description ?? $"Description for {title}",
            Provider = "Test Provider",
            Modality = modality,
            DurationMinutes = 60,
            IsActive = isActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    public static TrainingAssignment CreateTrainingAssignment(
        Guid courseId,
        long assigneeId,
        TrainingAssigneeType assigneeType = TrainingAssigneeType.User,
        TrainingAssignmentStatus status = TrainingAssignmentStatus.Assigned,
        int progress = 0)
    {
        return new TrainingAssignment
        {
            AssignmentId = Guid.NewGuid(),
            CourseId = courseId,
            AssigneeType = assigneeType,
            AssigneeId = assigneeId,
            DueDate = DateTimeOffset.UtcNow.AddDays(30),
            Status = status,
            Progress = progress,
            AssignedBy = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    public static ImportJob CreateImportJob(
        string filePath = "/tmp/test.csv",
        long requestedBy = 1,
        ImportJobStatus status = ImportJobStatus.Queued)
    {
        return new ImportJob
        {
            ImportJobId = Guid.NewGuid(),
            JobType = ImportJobType.KpiActuals,
            RequestedBy = requestedBy,
            FilePath = filePath,
            Status = status,
            ProcessedCount = 0,
            FailedCount = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }
}

