namespace Performance.Contracts.Performance;

public record CreateKpiActualRequest(
    Guid KpiId,
    long? UserId,
    long? TeamId,
    DateTimeOffset MeasuredAt,
    decimal Value,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd
);

public record KpiActualResponse(
    Guid ActualId,
    Guid KpiId,
    string KpiCode,
    string KpiName,
    long? UserId,
    long? TeamId,
    DateTimeOffset MeasuredAt,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    decimal Value,
    string SourceType,
    DateTimeOffset CreatedAt
);

