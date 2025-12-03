using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Performance.Contracts.Training;
using Performance.Domain.Enums;
using Performance.Infrastructure.Data;
using Performance.Integrations;

namespace Performance.Workers;

public class TrainingNotificationWorker(
    PerformanceDbContext dbContext,
    ILogger<TrainingNotificationWorker> logger,
    IMsGraphClient? graphClient,
    IEmailService? emailService)
{
    public async Task SendNotificationsAsync(
        NotifyStaffRequest request,
        CancellationToken cancellationToken)
    {
        var assignmentsQuery = dbContext.TrainingAssignments
            .Include(a => a.Course)
            .AsQueryable();

        if (request.AssignmentIds != null && request.AssignmentIds.Length > 0)
        {
            assignmentsQuery = assignmentsQuery.Where(a => request.AssignmentIds.Contains(a.AssignmentId));
        }
        else
        {
            if (request.UserId.HasValue)
            {
                assignmentsQuery = assignmentsQuery.Where(a => a.AssigneeId == request.UserId);
            }

            if (request.OverdueOnly == true)
            {
                var now = DateTimeOffset.UtcNow;
                assignmentsQuery = assignmentsQuery.Where(a =>
                    a.DueDate.HasValue && a.DueDate < now &&
                    a.Status != TrainingAssignmentStatus.Completed);
            }

            if (request.IncompleteOnly == true)
            {
                assignmentsQuery = assignmentsQuery.Where(a =>
                    a.Status != TrainingAssignmentStatus.Completed);
            }
        }

        var assignments = await assignmentsQuery.ToListAsync(cancellationToken);
        logger.LogInformation("Sending notifications for {Count} training assignments", assignments.Count);

        foreach (var assignment in assignments)
        {
            try
            {
                if (assignment.AssigneeId.HasValue)
                {
                    // Send email notification
                    if (emailService != null)
                    {
                        await emailService.SendTrainingReminderAsync(
                            assignment.AssigneeId.Value,
                            assignment.Course!.Title,
                            assignment.DueDate,
                            assignment.Course.TeamsMeetingUrl,
                            cancellationToken);
                    }

                    // Create Teams meeting invite if URL is provided
                    if (graphClient != null && !string.IsNullOrWhiteSpace(assignment.Course!.TeamsMeetingUrl))
                    {
                        // Note: In a real implementation, you'd create a Teams meeting via Graph API
                        // For now, we just log that it would be created
                        logger.LogInformation(
                            "Would create Teams meeting for assignment {AssignmentId} with URL {Url}",
                            assignment.AssignmentId,
                            assignment.Course.TeamsMeetingUrl);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send notification for assignment {AssignmentId}", assignment.AssignmentId);
            }
        }
    }
}

