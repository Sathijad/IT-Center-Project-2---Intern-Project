namespace Performance.Integrations;

public interface IEmailService
{
    Task SendTrainingReminderAsync(long userId, string courseTitle, DateTimeOffset? dueDate, string? teamsUrl, CancellationToken cancellationToken);
}

