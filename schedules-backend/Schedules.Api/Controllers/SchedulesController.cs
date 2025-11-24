using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Api.Contracts.Schedules;
using Schedules.Api.Services;
using Schedules.Api.Security;

namespace Schedules.Api.Controllers;

[ApiController]
[Route("api/v1/schedules")]
public class SchedulesController(IScheduleService scheduleService, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "ADMIN,TL,EMP")]
    public async Task<IActionResult> GetSchedules([FromQuery(Name = "user_id")] long? userId, [FromQuery(Name = "team_id")] Guid? teamId, [FromQuery] string? range, [FromQuery] int page = 1, [FromQuery] int size = 20, CancellationToken token = default)
    {
        (DateTime? start, DateTime? end) = ParseRange(range);
        var response = await scheduleService.GetAsync(userId, teamId, start, end, page, size, token);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest request, CancellationToken token)
    {
        var created = await scheduleService.CreateAsync(request, userContext.UserId, token);
        return CreatedAtAction(nameof(GetSchedules), new { schedule_id = created.ScheduleId }, created);
    }

    [HttpPatch("{schedule_id:guid}")]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> UpdateSchedule(Guid schedule_id, [FromBody] UpdateScheduleRequest request, CancellationToken token)
    {
        var updated = await scheduleService.UpdateAsync(schedule_id, request, token);
        return Ok(updated);
    }

    [HttpDelete("{schedule_id:guid}")]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> DeleteSchedule(Guid schedule_id, CancellationToken token)
    {
        await scheduleService.DeleteAsync(schedule_id, token);
        return NoContent();
    }

    private static (DateTime?, DateTime?) ParseRange(string? range)
    {
        if (string.IsNullOrEmpty(range))
        {
            return (null, null);
        }

        var parts = range.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2)
        {
            return (null, null);
        }

        return (DateTime.TryParse(parts[0], out var start) ? start : null,
            DateTime.TryParse(parts[1], out var end) ? end : null);
    }
}

