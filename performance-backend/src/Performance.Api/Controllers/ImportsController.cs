using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Extensions;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;
using Performance.Workers;

namespace Performance.Controllers;

[ApiController]
[Route("api/v1")]
public class ImportsController(
    IImportService importService,
    IDbContextFactory<PerformanceDbContext> dbContextFactory,
    IBackgroundJobClient backgroundJobClient) : ControllerBase
{
    [HttpPost("perf/actuals/import")]
    [Authorize]
    [ProducesResponseType(typeof(ImportJobResponse), StatusCodes.Status202Accepted)]
    public async Task<ActionResult<ImportJobResponse>> ImportKpiActuals(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);

        if (actorId == 0)
        {
            return Unauthorized("Unable to determine user ID from token.");
        }

        // Save file to temporary location
        var uploadsDir = Path.Combine(Path.GetTempPath(), "performance-imports");
        Directory.CreateDirectory(uploadsDir);
        var fileName = $"{Guid.NewGuid()}_{file.FileName}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        // Create import job
        var jobId = await importService.CreateImportJobAsync(filePath, actorId, cancellationToken);

        // Enqueue background processing
        backgroundJobClient.Enqueue<KpiImportWorker>(worker =>
            worker.ProcessAsync(jobId, CancellationToken.None));

        var job = await importService.GetImportJobAsync(jobId, cancellationToken);
        return AcceptedAtAction(nameof(GetImportJob), new { jobId }, job);
    }

    [HttpGet("imports/{jobId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ImportJobResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ImportJobResponse>> GetImportJob(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var job = await importService.GetImportJobAsync(jobId, cancellationToken);
        return Ok(job);
    }
}

