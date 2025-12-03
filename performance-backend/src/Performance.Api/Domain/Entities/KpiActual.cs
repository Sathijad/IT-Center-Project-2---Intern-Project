using Performance.Domain.Enums;

namespace Performance.Domain.Entities;

public class KpiActual
{
    public Guid ActualId { get; set; }
    public Guid KpiId { get; set; }
    public Kpi? Kpi { get; set; }
    public long? UserId { get; set; }
    public long? TeamId { get; set; }
    public DateTimeOffset MeasuredAt { get; set; }
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public decimal Value { get; set; }
    public KpiSourceType SourceType { get; set; } = KpiSourceType.Manual;
    public Guid? ImportJobId { get; set; }
    public ImportJob? ImportJob { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

