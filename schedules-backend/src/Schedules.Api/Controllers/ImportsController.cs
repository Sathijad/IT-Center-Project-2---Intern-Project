using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Contracts.Imports;
using Schedules.Extensions;
using Schedules.Services.Interfaces;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/imports")]
public class ImportsController(IImportService importService) : ControllerBase
{
    [HttpPost("schedules")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ImportJobResponse>> ImportSchedules([FromBody] ImportRequest request, CancellationToken cancellationToken)
    {
        var actorId = User.GetActorId();
        var response = await importService.StartScheduleImportAsync(request, actorId, cancellationToken);
        return Accepted(response);
    }

    [HttpGet("{jobId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ImportJobResponse>> GetStatus(Guid jobId, CancellationToken cancellationToken)
    {
        var response = await importService.GetJobAsync(jobId, cancellationToken);
        return Ok(response);
    }
}

