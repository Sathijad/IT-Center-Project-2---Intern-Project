namespace Performance.Integrations;

public class NoopEmailService : IEmailService
{
    public Task SendTrainingReminderAsync(long userId, string courseTitle, DateTimeOffset? dueDate, string? teamsUrl, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

