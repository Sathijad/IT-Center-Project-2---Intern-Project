using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Contracts.Availability;
using Schedules.Services.Interfaces;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/availability")]
public class AvailabilityController(IAvailabilityService availabilityService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<AvailabilityResponse>> Get([FromQuery] long user_id, [FromQuery] DateTimeOffset rangeStart, [FromQuery] DateTimeOffset rangeEnd, CancellationToken cancellationToken)
    {
        try
        {
            var response = await availabilityService.GetAsync(user_id, rangeStart, rangeEnd, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AvailabilityController.Get] Error: {ex.Message}");
            throw;
        }
    }
}

