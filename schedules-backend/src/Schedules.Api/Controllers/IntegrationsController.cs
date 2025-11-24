using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Workers;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/integrations")]
public class IntegrationsController(IBackgroundJobClient backgroundJobClient) : ControllerBase
{
    [HttpPost("msgraph/sync")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult TriggerSync([FromBody] SyncRequest request)
    {
        backgroundJobClient.Enqueue<CalendarSyncWorker>(worker => worker.PushAsync(request.ScheduleId, CancellationToken.None));
        return Accepted();
    }
}

public record SyncRequest(Guid ScheduleId);

