using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Schedules.Contracts;
using Schedules.Contracts.Tasks;
using Schedules.Extensions;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;
using Schedules.Workers;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/tasks")]
public class TasksController(
    ITaskService taskService,
    IBackgroundJobClient backgroundJobClient,
    IMemoryCache memoryCache,
    IDbContextFactory<SchedulesDbContext> dbContextFactory) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "Employee")]
    public async Task<ActionResult<PagedResult<TaskResponse>>> Get([FromQuery] TaskQuery query, CancellationToken cancellationToken)
    {
        var response = await taskService.GetAsync(query, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = "TeamLead")]
    public async Task<ActionResult<TaskResponse>> Create(
        [FromBody] CreateTaskRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return BadRequest("Idempotency-Key header is required.");
        }

        if (memoryCache.TryGetValue<TaskResponse>(idempotencyKey, out var cached))
        {
            return Ok(cached);
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
        if (actorId == 0)
        {
            return Unauthorized("Unable to determine user ID from token.");
        }
        var task = await taskService.CreateAsync(request, actorId, cancellationToken);
        memoryCache.Set(idempotencyKey, task, TimeSpan.FromHours(1));

        backgroundJobClient.Enqueue<TaskNotificationWorker>(worker =>
            worker.NotifyAsync(task.TaskId, CancellationToken.None));

        return StatusCode(StatusCodes.Status201Created, task);
    }

    [HttpPatch("{taskId:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<ActionResult<TaskResponse>> Update(Guid taskId, [FromBody] UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        var task = await taskService.UpdateAsync(taskId, request, cancellationToken);
        return Ok(task);
    }

    [HttpPost("{taskId:guid}/comments")]
    [Authorize(Policy = "Employee")]
    public async Task<ActionResult<TaskResponse>> AddComment(Guid taskId, [FromBody] CreateTaskNoteRequest request, CancellationToken cancellationToken)
    {
        var actorId = User.GetActorId();
        var task = await taskService.AddNoteAsync(taskId, request, actorId, cancellationToken);
        return Ok(task);
    }
}

