namespace Performance.Contracts.Performance;

public record CreateKpiRequest(
    string Code,
    string Name,
    string? Description,
    string? Unit,
    string? Category,
    string? CalculationHint
);

public record KpiResponse(
    Guid KpiId,
    string Code,
    string Name,
    string? Description,
    string? Unit,
    string? Category,
    string? CalculationHint,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);


