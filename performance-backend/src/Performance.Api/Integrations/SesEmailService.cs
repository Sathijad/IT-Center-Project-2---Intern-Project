using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Performance.Infrastructure.Data;

namespace Performance.Integrations;

public class SesEmailService(
    IAmazonSimpleEmailService sesClient,
    PerformanceDbContext dbContext,
    ILogger<SesEmailService> logger) : IEmailService
{
    public async Task SendTrainingReminderAsync(
        long userId,
        string courseTitle,
        DateTimeOffset? dueDate,
        string? teamsUrl,
        CancellationToken cancellationToken)
    {
        // Get user email from app_users table
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT email FROM app_users WHERE id = @p0 LIMIT 1";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@p0";
            parameter.Value = userId;
            command.Parameters.Add(parameter);

            var emailResult = await command.ExecuteScalarAsync(cancellationToken);
            if (emailResult == null || emailResult == DBNull.Value)
            {
                logger.LogWarning("User {UserId} not found for email notification", userId);
                return;
            }

            var email = emailResult.ToString()!;
            var dueDateText = dueDate.HasValue ? dueDate.Value.ToString("yyyy-MM-dd") : "No due date";
            var teamsLink = !string.IsNullOrWhiteSpace(teamsUrl) ? $" Join: {teamsUrl}" : "";

            var subject = $"Training Reminder: {courseTitle}";
            var body = $@"
You have been assigned to complete the following training:

Course: {courseTitle}
Due Date: {dueDateText}
{teamsLink}

Please complete this training at your earliest convenience.
";

            var request = new SendEmailRequest
            {
                Source = "noreply@itcenter.internal", // Configure this in appsettings
                Destination = new Destination { ToAddresses = new List<string> { email } },
                Message = new Message
                {
                    Subject = new Content(subject),
                    Body = new Body { Text = new Content(body) }
                }
            };

            await sesClient.SendEmailAsync(request, cancellationToken);
            logger.LogInformation("Sent training reminder email to {Email} for course {CourseTitle}", email, courseTitle);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send training reminder email to user {UserId}", userId);
        }
        finally
        {
            await connection.CloseAsync();
        }
    }
}

