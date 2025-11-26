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
    public async Task<ActionResult<PagedResult<ScheduleResponse>>> Get(
        [FromQuery(Name = "userId")] long? userId,
        [FromQuery(Name = "teamId")] long? teamId,
        [FromQuery(Name = "rangeStart")] DateTimeOffset? rangeStart,
        [FromQuery(Name = "rangeEnd")] DateTimeOffset? rangeEnd,
        CancellationToken cancellationToken,
        [FromQuery(Name = "page")] int page = 1,
        [FromQuery(Name = "size")] int size = 20)
    {
        var query = new ScheduleQuery(userId, teamId, rangeStart, rangeEnd, page, size);
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
    public async Task<ActionResult<PagedResult<ScheduleResponse>>> GetMySchedules(
        [FromQuery(Name = "rangeStart")] DateTimeOffset? rangeStart,
        [FromQuery(Name = "rangeEnd")] DateTimeOffset? rangeEnd,
        [FromQuery(Name = "page")] int page = 1,
        [FromQuery(Name = "size")] int size = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            Console.WriteLine($"[SchedulesController.GetMySchedules] Request received - rangeStart: {rangeStart}, rangeEnd: {rangeEnd}, page: {page}, size: {size}");
            
            // Convert DateTimeOffset to UTC (PostgreSQL requires UTC for timestamp with time zone)
            DateTimeOffset? rangeStartUtc = rangeStart?.ToUniversalTime();
            DateTimeOffset? rangeEndUtc = rangeEnd?.ToUniversalTime();
            
            Console.WriteLine($"[SchedulesController.GetMySchedules] Converted to UTC - rangeStart: {rangeStartUtc}, rangeEnd: {rangeEndUtc}");
            
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            
            if (actorId == 0)
            {
                Console.WriteLine($"[SchedulesController.GetMySchedules] ❌ Unable to determine user ID from token");
                return Unauthorized("Unable to determine user ID from token.");
            }
            
            Console.WriteLine($"[SchedulesController.GetMySchedules] ✅ User ID resolved: {actorId}");
            
            // Create query with explicit parameters (using UTC dates)
            var userQuery = new ScheduleQuery(UserId: actorId, TeamId: null, RangeStart: rangeStartUtc, RangeEnd: rangeEndUtc, Page: page, Size: size);
            
            Console.WriteLine($"[SchedulesController.GetMySchedules] Executing query for user {actorId}...");
            var response = await scheduleService.GetAsync(userQuery, cancellationToken);
            
            Console.WriteLine($"[SchedulesController.GetMySchedules] ✅ Retrieved {response.Items.Count} schedules (total: {response.TotalCount})");
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SchedulesController.GetMySchedules] ❌ Error: {ex.Message}");
            Console.WriteLine($"[SchedulesController.GetMySchedules] Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[SchedulesController.GetMySchedules] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[SchedulesController.GetMySchedules] Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"[SchedulesController.GetMySchedules] Inner stack trace: {ex.InnerException.StackTrace}");
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

