namespace Performance.Domain.Entities;

public class Kpi
{
    public Guid KpiId { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public string? Category { get; set; }
    public string? CalculationHint { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<KpiTarget> Targets { get; set; } = new List<KpiTarget>();
    public ICollection<KpiActual> Actuals { get; set; } = new List<KpiActual>();
}

