using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Api.Contracts.Availability;
using Schedules.Api.Services;

namespace Schedules.Api.Controllers;

[ApiController]
[Route("api/v1/availability")]
public class AvailabilityController(IAvailabilityService availabilityService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "ADMIN,TL")]
    public async Task<ActionResult<IEnumerable<AvailabilitySlotDto>>> GetAvailability([FromQuery(Name = "user_id")] long userId, [FromQuery] string range, CancellationToken token = default)
    {
        var slots = await availabilityService.GetAsync(userId, range, token);
        return Ok(slots);
    }
}

