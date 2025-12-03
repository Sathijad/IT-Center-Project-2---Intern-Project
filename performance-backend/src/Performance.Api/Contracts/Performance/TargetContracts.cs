using Performance.Domain.Enums;

namespace Performance.Contracts.Performance;

public record CreateKpiTargetRequest(
    Guid KpiId,
    long? UserId,
    long? TeamId,
    KpiPeriodType PeriodType,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TargetValue
);

public record UpdateKpiTargetRequest(
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    decimal? TargetValue
);

public record KpiTargetResponse(
    Guid TargetId,
    Guid KpiId,
    string KpiCode,
    string KpiName,
    long? UserId,
    long? TeamId,
    KpiPeriodType PeriodType,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TargetValue,
    long CreatedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

