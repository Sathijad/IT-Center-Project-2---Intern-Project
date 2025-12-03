using Performance.Domain.Enums;

namespace Performance.Domain.Entities;

public class KpiTarget
{
    public Guid TargetId { get; set; }
    public Guid KpiId { get; set; }
    public Kpi? Kpi { get; set; }
    public long? UserId { get; set; }
    public long? TeamId { get; set; }
    public KpiPeriodType PeriodType { get; set; } = KpiPeriodType.Monthly;
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal TargetValue { get; set; }
    public long CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

