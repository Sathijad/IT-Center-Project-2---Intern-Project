using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts;
using Performance.Contracts.Training;
using Performance.Extensions;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Controllers;

[ApiController]
[Route("api/v1/training")]
public class TrainingController(
    ITrainingCourseService courseService,
    ITrainingAssignmentService assignmentService,
    IDbContextFactory<PerformanceDbContext> dbContextFactory) : ControllerBase
{
    [HttpGet("courses")]
    [Authorize]
    [ProducesResponseType(typeof(PagedResult<CourseResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CourseResponse>>> GetCourses(
        [FromQuery(Name = "query")] string? query,
        [FromQuery(Name = "page")] int page = 1,
        [FromQuery(Name = "size")] int size = 20,
        CancellationToken cancellationToken = default)
    {
        var courseQuery = new CourseQuery(query, page, size);
        var result = await courseService.SearchAsync(courseQuery, cancellationToken);
        return Ok(result);
    }

    [HttpGet("courses/{courseId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(CourseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseResponse>> GetCourse(
        Guid courseId,
        CancellationToken cancellationToken)
    {
        var course = await courseService.GetByIdAsync(courseId, cancellationToken);
        if (course == null)
        {
            return NotFound($"Course {courseId} not found");
        }
        return Ok(course);
    }

    [HttpPost("courses")]
    [Authorize]
    [ProducesResponseType(typeof(CourseResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CourseResponse>> CreateCourse(
        [FromBody] CreateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var course = await courseService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCourse), new { courseId = course.CourseId }, course);
    }

    [HttpPatch("courses/{courseId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(CourseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseResponse>> UpdateCourse(
        Guid courseId,
        [FromBody] UpdateCourseRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var course = await courseService.UpdateAsync(courseId, request, cancellationToken);
            return Ok(course);
        }
        catch (Performance.Errors.NotFoundException)
        {
            return NotFound($"Course {courseId} not found");
        }
    }

    [HttpPost("assign")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyCollection<AssignmentResponse>), StatusCodes.Status201Created)]
    public async Task<ActionResult<IReadOnlyCollection<AssignmentResponse>>> AssignTraining(
        [FromBody] AssignTrainingRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);

        if (actorId == 0)
        {
            return Unauthorized("Unable to determine user ID from token.");
        }

        var assignments = await assignmentService.AssignAsync(request, actorId, cancellationToken);
        return CreatedAtAction(nameof(AssignTraining), assignments);
    }

    [HttpPatch("assignments/{assignmentId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(AssignmentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AssignmentResponse>> UpdateAssignment(
        Guid assignmentId,
        [FromBody] UpdateAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var assignment = await assignmentService.UpdateAsync(assignmentId, request, cancellationToken);
        return Ok(assignment);
    }
}

