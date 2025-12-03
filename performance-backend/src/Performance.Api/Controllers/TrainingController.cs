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
        CancellationToken cancellationToken)
    {
        var courseQuery = new CourseQuery(query, page, size);
        var result = await courseService.SearchAsync(courseQuery, cancellationToken);
        return Ok(result);
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

