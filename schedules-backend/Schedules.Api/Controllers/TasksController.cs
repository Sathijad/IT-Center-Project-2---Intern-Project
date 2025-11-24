using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Api.Contracts.Tasks;
using Schedules.Api.Services;
using Schedules.Api.Security;

namespace Schedules.Api.Controllers;

[ApiController]
[Route("api/v1/tasks")]
public class TasksController(ITaskService taskService, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "ADMIN,TL,EMP")]
    public async Task<IActionResult> GetTasks([FromQuery] long? assignee, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 20, CancellationToken token = default)
    {
        var response = await taskService.GetAsync(assignee, status, page, size, token);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request, CancellationToken token)
    {
        var created = await taskService.CreateAsync(request, userContext.UserId, token);
        return CreatedAtAction(nameof(GetTasks), new { task_id = created.TaskId }, created);
    }

    [HttpPatch("{task_id:guid}")]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> UpdateTask(Guid task_id, [FromBody] UpdateTaskRequest request, CancellationToken token)
    {
        var updated = await taskService.UpdateAsync(task_id, request, token);
        return Ok(updated);
    }

    [HttpPost("{task_id:guid}/comments")]
    [Authorize(Roles = "ADMIN,TL,EMP")]
    public async Task<IActionResult> AddComment(Guid task_id, [FromBody] CreateTaskCommentRequest request, CancellationToken token)
    {
        var comment = await taskService.AddCommentAsync(task_id, request, userContext.UserId, token);
        return StatusCode(StatusCodes.Status201Created, comment);
    }
}

