using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedules.Api.Services;
using Schedules.Api.Security;

namespace Schedules.Api.Controllers;

[ApiController]
[Route("api/v1/imports")]
public class ImportsController(IImportService importService, IUserContext userContext) : ControllerBase
{
    [HttpPost("schedules")]
    [Authorize(Roles = "ADMIN")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> ImportSchedules([FromForm] IFormFile file, CancellationToken token)
    {
        if (file.Length == 0)
        {
            return BadRequest("File is empty.");
        }

        await using var stream = file.OpenReadStream();
        var job = await importService.StartSchedulesImportAsync(stream, file.FileName, userContext.UserId, token);
        return Accepted(job);
    }

    [HttpGet("{job_id:guid}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetJob(Guid job_id, CancellationToken token)
    {
        var job = await importService.GetJobAsync(job_id, token);
        return Ok(job);
    }
}

