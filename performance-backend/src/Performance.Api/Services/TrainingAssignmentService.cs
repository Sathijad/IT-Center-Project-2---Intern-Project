using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Training;
using Performance.Domain.Entities;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class TrainingAssignmentService(PerformanceDbContext dbContext) : ITrainingAssignmentService
{
    public async Task<IReadOnlyCollection<AssignmentResponse>> AssignAsync(
        AssignTrainingRequest request,
        long actorId,
        CancellationToken cancellationToken)
    {
        var course = await dbContext.TrainingCourses.FindAsync([request.CourseId], cancellationToken);
        if (course == null)
        {
            throw new NotFoundException($"Course {request.CourseId} not found");
        }

        var assignments = new List<TrainingAssignment>();

        if (request.AssigneeType == Domain.Enums.TrainingAssigneeType.User && request.AssigneeId.HasValue)
        {
            var assignment = new TrainingAssignment
            {
                AssignmentId = Guid.NewGuid(),
                CourseId = request.CourseId,
                AssigneeType = request.AssigneeType,
                AssigneeId = request.AssigneeId,
                DueDate = request.DueDate,
                Status = Domain.Enums.TrainingAssignmentStatus.Assigned,
                Progress = 0,
                AssignedBy = actorId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            assignments.Add(assignment);
            dbContext.TrainingAssignments.Add(assignment);
        }
        else if (request.AssigneeType == Domain.Enums.TrainingAssigneeType.Cohort && !string.IsNullOrWhiteSpace(request.CohortId))
        {
            // For cohort assignments, we'd need to look up users in the cohort
            // For now, create a single assignment with cohort_id
            var assignment = new TrainingAssignment
            {
                AssignmentId = Guid.NewGuid(),
                CourseId = request.CourseId,
                AssigneeType = request.AssigneeType,
                CohortId = request.CohortId,
                DueDate = request.DueDate,
                Status = Domain.Enums.TrainingAssignmentStatus.Assigned,
                Progress = 0,
                AssignedBy = actorId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            assignments.Add(assignment);
            dbContext.TrainingAssignments.Add(assignment);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return assignments.Select(a => MapToResponse(a, course)).ToList();
    }

    public async Task<AssignmentResponse> UpdateAsync(
        Guid assignmentId,
        UpdateAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var assignment = await dbContext.TrainingAssignments
            .Include(a => a.Course)
            .FirstOrDefaultAsync(a => a.AssignmentId == assignmentId, cancellationToken);

        if (assignment == null)
        {
            throw new NotFoundException($"Assignment {assignmentId} not found");
        }

        if (request.Status.HasValue)
        {
            assignment.Status = request.Status.Value;
        }

        if (request.Progress.HasValue)
        {
            assignment.Progress = Math.Clamp(request.Progress.Value, 0, 100);
        }

        if (request.CompletedAt.HasValue)
        {
            assignment.CompletedAt = request.CompletedAt;
            if (assignment.Status != Domain.Enums.TrainingAssignmentStatus.Completed)
            {
                assignment.Status = Domain.Enums.TrainingAssignmentStatus.Completed;
            }
        }

        assignment.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(assignment, assignment.Course!);
    }

    public async Task<IReadOnlyCollection<AssignmentResponse>> GetByUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var assignments = await dbContext.TrainingAssignments
            .Include(a => a.Course)
            .Where(a => a.AssigneeId == userId)
            .ToListAsync(cancellationToken);

        return assignments.Select(a => MapToResponse(a, a.Course!)).ToList();
    }

    private static AssignmentResponse MapToResponse(TrainingAssignment assignment, TrainingCourse course)
    {
        return new AssignmentResponse(
            assignment.AssignmentId,
            assignment.CourseId,
            course.Title,
            assignment.AssigneeType,
            assignment.AssigneeId,
            assignment.CohortId,
            assignment.DueDate,
            assignment.Status,
            assignment.Progress,
            assignment.CompletedAt,
            assignment.AssignedBy,
            assignment.CreatedAt,
            assignment.UpdatedAt
        );
    }
}

