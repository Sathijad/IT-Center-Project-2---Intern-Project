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
        try
        {
            var response = await taskService.GetAsync(query, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController.Get] Error: {ex.Message}");
            Console.WriteLine($"[TasksController.Get] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TasksController.Get] Inner exception: {ex.InnerException.Message}");
            }
            throw; // Re-throw to let ExceptionHandlingMiddleware handle it
        }
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<TaskResponse>> Create(
        [FromBody] CreateTaskRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        try
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
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController.Create] Error: {ex.Message}");
            throw;
        }
    }

    [HttpPatch("{taskId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<TaskResponse>> Update(Guid taskId, [FromBody] UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var task = await taskService.UpdateAsync(taskId, request, cancellationToken);
            return Ok(task);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController.Update] Error: {ex.Message}");
            throw;
        }
    }

    [HttpPost("{taskId:guid}/comments")]
    [Authorize(Policy = "Employee")]
    public async Task<ActionResult<TaskResponse>> AddComment(Guid taskId, [FromBody] CreateTaskNoteRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            if (actorId == 0)
            {
                return Unauthorized("Unable to determine user ID from token.");
            }
            var task = await taskService.AddNoteAsync(taskId, request, actorId, cancellationToken);
            return Ok(task);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController.AddComment] Error: {ex.Message}");
            throw;
        }
    }
}

