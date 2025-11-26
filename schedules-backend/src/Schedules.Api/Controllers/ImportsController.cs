using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts.Imports;
using Schedules.Extensions;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;

namespace Schedules.Controllers;

[ApiController]
[Route("api/v1/imports")]
public class ImportsController(IImportService importService, IDbContextFactory<SchedulesDbContext> dbContextFactory) : ControllerBase
{
    [HttpPost("schedules")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ImportJobResponse>> ImportSchedules([FromBody] ImportRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);
            if (actorId == 0)
            {
                return Unauthorized("Unable to determine user ID from token.");
            }
            var response = await importService.StartScheduleImportAsync(request, actorId, cancellationToken);
            return Accepted(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ImportsController.ImportSchedules] Error: {ex.Message}");
            throw;
        }
    }

    [HttpGet("{jobId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ImportJobResponse>> GetStatus(Guid jobId, CancellationToken cancellationToken)
    {
        try
        {
            var response = await importService.GetJobAsync(jobId, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ImportsController.GetStatus] Error: {ex.Message}");
            throw;
        }
    }
}

