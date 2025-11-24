using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Api.Contracts.Availability;
using Schedules.Api.Services;

namespace Schedules.Api.Controllers;

[ApiController]
[Route("api/v1/integrations/msgraph")]
public class IntegrationsController(IAvailabilityService availabilityService) : ControllerBase
{
    [HttpPost("sync")]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<IActionResult> TriggerCalendarSync([FromBody] GraphSyncRequest request, CancellationToken token)
    {
        await availabilityService.TriggerSyncAsync(request.UserId, request.Range, token);
        return Accepted();
    }
}

