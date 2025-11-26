using System.Collections.Generic;
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
            var isAdmin = User.IsInRole("ADMIN");
            
            if (actorId == 0)
            {
                Console.WriteLine($"[TasksController.Get] ❌ Unable to determine user ID from token");
                return Unauthorized("Unable to determine user ID from token.");
            }
            
            long? finalAssignee = null;
            
            if (assignee.HasValue)
            {
                if (!isAdmin && assignee.Value != actorId)
                {
                    Console.WriteLine($"[TasksController.Get] ⚠️ User {actorId} attempted to view tasks for user {assignee.Value} (not authorized)");
                    return Forbid("You can only view your own tasks.");
                }
                finalAssignee = assignee.Value;
            }
            else
            {
                // Employees always restricted to their own tasks, admins can view all tasks
                finalAssignee = isAdmin ? null : actorId;
            }
            
            Console.WriteLine($"[TasksController.Get] Fetching tasks for assignee: {(finalAssignee.HasValue ? finalAssignee.ToString() : "ALL")}, page: {page}, size: {size}");
            
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
    [Authorize(Policy = "Employee")]
    public async Task<ActionResult<TaskResponse>> Update(Guid taskId, [FromBody] UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            var isAdmin = User.IsInRole("ADMIN");
            
            if (actorId == 0)
            {
                Console.WriteLine($"[TasksController.Update] ❌ Unable to determine user ID from token");
                return Unauthorized("Unable to determine user ID from token.");
            }
            
            var existingTask = await dbContext.Tasks
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);
            
            if (existingTask is null)
            {
                return NotFound($"Task {taskId} not found");
            }
            
            if (!isAdmin)
            {
                if (existingTask.AssigneeId != actorId)
                {
                    Console.WriteLine($"[TasksController.Update] ⚠️ User {actorId} attempted to update task {taskId} not assigned to them");
                    return Forbid("You can only update tasks assigned to you.");
                }
                
                var invalidFields = new List<string>();
                if (request.Title is not null) invalidFields.Add(nameof(request.Title));
                if (request.Description is not null) invalidFields.Add(nameof(request.Description));
                if (request.Priority.HasValue) invalidFields.Add(nameof(request.Priority));
                if (request.DueDate.HasValue) invalidFields.Add(nameof(request.DueDate));
                if (request.Tags is not null) invalidFields.Add(nameof(request.Tags));
                
                if (invalidFields.Count > 0)
                {
                    return Forbid($"You may only update the task status. Fields not permitted: {string.Join(", ", invalidFields)}");
                }
                
                if (!request.Status.HasValue)
                {
                    return BadRequest("Status is required when updating your task.");
                }
            }
            
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

