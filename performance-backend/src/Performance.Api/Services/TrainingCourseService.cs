using Microsoft.EntityFrameworkCore;
using Performance.Contracts;
using Performance.Contracts.Training;
using Performance.Domain.Entities;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Services;

public class TrainingCourseService(PerformanceDbContext dbContext) : ITrainingCourseService
{
    public async Task<PagedResult<CourseResponse>> SearchAsync(
        CourseQuery query,
        CancellationToken cancellationToken)
    {
        var coursesQuery = dbContext.TrainingCourses.AsNoTracking()
            .Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Query))
        {
            var searchTerm = query.Query.ToLower();
            coursesQuery = coursesQuery.Where(c =>
                c.Title.ToLower().Contains(searchTerm) ||
                (c.Description != null && c.Description.ToLower().Contains(searchTerm)));
        }

        var total = await coursesQuery.CountAsync(cancellationToken);

        var courses = await coursesQuery
            .OrderBy(c => c.Title)
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ToListAsync(cancellationToken);

        var items = courses.Select(MapToResponse).ToList();
        return new PagedResult<CourseResponse>(items, query.Page, query.Size, total);
    }

    public async Task<CourseResponse> CreateAsync(
        CreateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var course = new TrainingCourse
        {
            CourseId = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Provider = request.Provider,
            Modality = request.Modality,
            TeamsMeetingUrl = request.TeamsMeetingUrl,
            SharePointUrl = request.SharePointUrl,
            OneDriveUrl = request.OneDriveUrl,
            DurationMinutes = request.DurationMinutes,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.TrainingCourses.Add(course);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(course);
    }

    public async Task<CourseResponse> UpdateAsync(
        Guid courseId,
        UpdateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var course = await dbContext.TrainingCourses.FindAsync([courseId], cancellationToken);
        if (course == null)
        {
            throw new NotFoundException($"Course {courseId} not found");
        }

        if (request.Title != null)
        {
            course.Title = request.Title;
        }

        if (request.Description != null)
        {
            course.Description = request.Description;
        }

        if (request.Provider != null)
        {
            course.Provider = request.Provider;
        }

        if (request.Modality.HasValue)
        {
            course.Modality = request.Modality.Value;
        }

        if (request.TeamsMeetingUrl != null)
        {
            course.TeamsMeetingUrl = request.TeamsMeetingUrl;
        }

        if (request.SharePointUrl != null)
        {
            course.SharePointUrl = request.SharePointUrl;
        }

        if (request.OneDriveUrl != null)
        {
            course.OneDriveUrl = request.OneDriveUrl;
        }

        if (request.DurationMinutes.HasValue)
        {
            course.DurationMinutes = request.DurationMinutes.Value;
        }

        if (request.IsActive.HasValue)
        {
            course.IsActive = request.IsActive.Value;
        }

        course.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(course);
    }

    public async Task<CourseResponse?> GetByIdAsync(
        Guid courseId,
        CancellationToken cancellationToken)
    {
        var course = await dbContext.TrainingCourses.FindAsync([courseId], cancellationToken);
        return course == null ? null : MapToResponse(course);
    }

    private static CourseResponse MapToResponse(TrainingCourse course)
    {
        return new CourseResponse(
            course.CourseId,
            course.Title,
            course.Description,
            course.Provider,
            course.Modality,
            course.TeamsMeetingUrl,
            course.SharePointUrl,
            course.OneDriveUrl,
            course.DurationMinutes,
            course.IsActive,
            course.CreatedAt,
            course.UpdatedAt
        );
    }
}

