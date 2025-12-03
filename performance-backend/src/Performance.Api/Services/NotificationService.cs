using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Training;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class NotificationService(PerformanceDbContext dbContext) : INotificationService
{
    public async Task<int> QueueNotificationsAsync(
        NotifyStaffRequest request,
        CancellationToken cancellationToken)
    {
        var assignmentsQuery = dbContext.TrainingAssignments.AsNoTracking();

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
                    a.Status != Domain.Enums.TrainingAssignmentStatus.Completed);
            }

            if (request.IncompleteOnly == true)
            {
                assignmentsQuery = assignmentsQuery.Where(a =>
                    a.Status != Domain.Enums.TrainingAssignmentStatus.Completed);
            }
        }

        var assignments = await assignmentsQuery.ToListAsync(cancellationToken);

        // Return count of assignments that will be notified
        // Actual notification sending will be handled by a background worker
        return assignments.Count;
    }
}

