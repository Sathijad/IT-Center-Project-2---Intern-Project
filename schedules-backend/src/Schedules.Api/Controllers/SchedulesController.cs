using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Contracts;
using Schedules.Contracts.Schedules;
using Schedules.Extensions;
using Schedules.Services.Interfaces;
using Schedules.Workers;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/schedules")]
public class SchedulesController(IScheduleService scheduleService, IBackgroundJobClient backgroundJobClient) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "TeamLead")]
    [ProducesResponseType(typeof(PagedResult<ScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ScheduleResponse>>> Get([FromQuery] ScheduleQuery query, CancellationToken cancellationToken)
    {
        var response = await scheduleService.GetAsync(query, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = "TeamLead")]
    public async Task<ActionResult<ScheduleResponse>> Create([FromBody] CreateScheduleRequest request, CancellationToken cancellationToken)
    {
        var actorId = User.GetActorId();
        var schedule = await scheduleService.CreateAsync(request, actorId, cancellationToken);
        backgroundJobClient.Enqueue<CalendarSyncWorker>(worker =>
            worker.PushAsync(schedule.ScheduleId, CancellationToken.None));
        return CreatedAtAction(nameof(Get), new { schedule.ScheduleId }, schedule);
    }

    [HttpPatch("{scheduleId:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<ActionResult<ScheduleResponse>> Update(Guid scheduleId, [FromBody] UpdateScheduleRequest request, CancellationToken cancellationToken)
    {
        var schedule = await scheduleService.UpdateAsync(scheduleId, request, cancellationToken);
        backgroundJobClient.Enqueue<CalendarSyncWorker>(worker =>
            worker.PushAsync(schedule.ScheduleId, CancellationToken.None));
        return Ok(schedule);
    }

    [HttpDelete("{scheduleId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid scheduleId, CancellationToken cancellationToken)
    {
        await scheduleService.DeleteAsync(scheduleId, cancellationToken);
        return NoContent();
    }
}

