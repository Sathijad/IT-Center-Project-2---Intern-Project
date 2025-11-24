using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Schedules.Contracts;
using Schedules.Contracts.Tasks;
using Schedules.Extensions;
using Schedules.Services.Interfaces;
using Schedules.Workers;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/tasks")]
public class TasksController(
    ITaskService taskService,
    IBackgroundJobClient backgroundJobClient,
    IMemoryCache memoryCache) : ControllerBase
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
    public async Task<ActionResult<TaskResponse>> Create([FromBody] CreateTaskRequest request, CancellationToken cancellationToken)
    {
        var key = Request.Headers["Idempotency-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest("Idempotency-Key header is required.");
        }

        if (memoryCache.TryGetValue<TaskResponse>(key, out var cached))
        {
            return Ok(cached);
        }

        var actorId = User.GetActorId();
        var task = await taskService.CreateAsync(request, actorId, cancellationToken);
        memoryCache.Set(key, task, TimeSpan.FromHours(1));

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

