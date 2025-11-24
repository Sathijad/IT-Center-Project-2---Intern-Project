namespace Schedules.Integrations.Models;

public class TeamsWebhookCard
{
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public long AssigneeId { get; set; }
    public DateTimeOffset? DueDate { get; set; }
}

