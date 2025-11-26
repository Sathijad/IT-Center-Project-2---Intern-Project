using System.Security.Claims;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts;
using Schedules.Contracts.Schedules;
using Schedules.Extensions;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;
using Schedules.Workers;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/schedules")]
public class SchedulesController(
    IScheduleService scheduleService,
    IBackgroundJobClient backgroundJobClient,
    IDbContextFactory<SchedulesDbContext> dbContextFactory) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(PagedResult<ScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ScheduleResponse>>> Get([FromQuery] ScheduleQuery query, CancellationToken cancellationToken)
    {
        try
        {
            var response = await scheduleService.GetAsync(query, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SchedulesController.Get] Error: {ex.Message}");
            Console.WriteLine($"[SchedulesController.Get] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[SchedulesController.Get] Inner exception: {ex.InnerException.Message}");
            }
            throw; // Re-throw to let ExceptionHandlingMiddleware handle it
        }
    }

    [HttpGet("my")]
    [Authorize(Policy = "Employee")]
    [ProducesResponseType(typeof(PagedResult<ScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ScheduleResponse>>> GetMySchedules([FromQuery] ScheduleQuery query, CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            
            if (actorId == 0)
            {
                return Unauthorized("Unable to determine user ID from token.");
            }
            
            // Force query to only show schedules for the current user
            query.UserId = actorId;
            
            var response = await scheduleService.GetAsync(query, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SchedulesController.GetMySchedules] Error: {ex.Message}");
            Console.WriteLine($"[SchedulesController.GetMySchedules] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[SchedulesController.GetMySchedules] Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ScheduleResponse>> Create([FromBody] CreateScheduleRequest request, CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // Debug: Log ALL claims to see what's available
        var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
        Console.WriteLine($"[SchedulesController] All claims: {string.Join(", ", allClaims)}");
        
        // Try multiple ways to find the sub claim
        var subClaim = User.FindFirst("sub")?.Value 
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        
        Console.WriteLine($"[SchedulesController] Sub claim found: {subClaim ?? "NULL"}");
        
        var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
        
        Console.WriteLine($"[SchedulesController] ActorId from lookup: {actorId}");
        
        if (actorId == 0)
        {
            // More detailed error message
            return Unauthorized($"Unable to determine user ID from token. Sub claim: {subClaim ?? "missing"}. Available claims: {string.Join(", ", User.Claims.Select(c => c.Type))}. Please ensure you are logged in and your user exists in app_users table.");
        }
        
        var schedule = await scheduleService.CreateAsync(request, actorId, cancellationToken);
        backgroundJobClient.Enqueue<CalendarSyncWorker>(worker =>
            worker.PushAsync(schedule.ScheduleId, CancellationToken.None));
        return CreatedAtAction(nameof(Get), new { schedule.ScheduleId }, schedule);
    }

    [HttpPatch("{scheduleId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ScheduleResponse>> Update(Guid scheduleId, [FromBody] UpdateScheduleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await scheduleService.UpdateAsync(scheduleId, request, cancellationToken);
            backgroundJobClient.Enqueue<CalendarSyncWorker>(worker =>
                worker.PushAsync(schedule.ScheduleId, CancellationToken.None));
            return Ok(schedule);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SchedulesController.Update] Error: {ex.Message}");
            throw;
        }
    }

    [HttpDelete("{scheduleId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid scheduleId, CancellationToken cancellationToken)
    {
        try
        {
            await scheduleService.DeleteAsync(scheduleId, cancellationToken);
            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SchedulesController.Delete] Error: {ex.Message}");
            throw;
        }
    }
}

