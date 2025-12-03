using Performance.Contracts;
using Performance.Contracts.Training;

namespace Performance.Services.Interfaces;

public interface ITrainingCourseService
{
    Task<PagedResult<CourseResponse>> SearchAsync(CourseQuery query, CancellationToken cancellationToken);
    Task<CourseResponse> CreateAsync(CreateCourseRequest request, CancellationToken cancellationToken);
    Task<CourseResponse> UpdateAsync(Guid courseId, UpdateCourseRequest request, CancellationToken cancellationToken);
    Task<CourseResponse?> GetByIdAsync(Guid courseId, CancellationToken cancellationToken);
}

