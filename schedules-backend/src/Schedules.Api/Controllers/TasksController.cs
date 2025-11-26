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
    public async Task<ActionResult<PagedResult<TaskResponse>>> Get(
        [FromQuery(Name = "assignee")] long? assignee,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "page")] int page = 1,
        [FromQuery(Name = "size")] int size = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            
            if (actorId == 0)
            {
                Console.WriteLine($"[TasksController.Get] ❌ Unable to determine user ID from token");
                return Unauthorized("Unable to determine user ID from token.");
            }
            
            // Security: If assignee is provided, ensure it matches the authenticated user
            // (Non-admin users can only view their own tasks)
            if (assignee.HasValue && assignee.Value != actorId)
            {
                // Check if user is admin (can view other users' tasks)
                var isAdmin = User.IsInRole("ADMIN");
                if (!isAdmin)
                {
                    Console.WriteLine($"[TasksController.Get] ⚠️ User {actorId} attempted to view tasks for user {assignee.Value} (not authorized)");
                    return Forbid("You can only view your own tasks.");
                }
            }
            
            // Use authenticated user's ID if assignee not provided or not authorized
            var finalAssignee = assignee.HasValue && (assignee.Value == actorId || User.IsInRole("ADMIN")) 
                ? assignee.Value 
                : actorId;
            
            Console.WriteLine($"[TasksController.Get] Fetching tasks for assignee: {finalAssignee}, page: {page}, size: {size}");
            
            var query = new TaskQuery(Assignee: finalAssignee, Status: status, Page: page, Size: size);
            var response = await taskService.GetAsync(query, cancellationToken);
            
            Console.WriteLine($"[TasksController.Get] ✅ Retrieved {response.Items.Count} tasks (total: {response.TotalCount})");
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController.Get] ❌ Error: {ex.Message}");
            Console.WriteLine($"[TasksController.Get] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TasksController.Get] Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"[TasksController.Get] Inner stack trace: {ex.InnerException.StackTrace}");
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

