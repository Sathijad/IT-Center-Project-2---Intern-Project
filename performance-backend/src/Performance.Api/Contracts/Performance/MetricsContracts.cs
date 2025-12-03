namespace Performance.Contracts.Performance;

public record MetricsQuery(
    long? UserId,
    long? TeamId,
    string? KpiCode,
    DateTimeOffset? RangeStart,
    DateTimeOffset? RangeEnd,
    int Page = 1,
    int Size = 20
);

public record MetricsSnapshotResponse(
    string KpiCode,
    string KpiName,
    decimal? CurrentValue,
    decimal? TargetValue,
    decimal? Variance,
    string? Unit,
    DateTimeOffset? LastMeasuredAt
);

public record MetricsTimeSeriesResponse(
    string KpiCode,
    string KpiName,
    string? Unit,
    IReadOnlyCollection<TimeSeriesPoint> DataPoints
);

public record TimeSeriesPoint(
    DateTimeOffset Timestamp,
    decimal Value
);

