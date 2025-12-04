using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Extensions;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;

namespace Performance.Controllers;

[ApiController]
[Route("api/v1/perf")]
public class PerformanceController(
    IMetricsService metricsService,
    IKpiTargetService kpiTargetService,
    IKpiService kpiService,
    IDbContextFactory<PerformanceDbContext> dbContextFactory) : ControllerBase
{
    [HttpGet("metrics")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyCollection<MetricsSnapshotResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<MetricsSnapshotResponse>>> GetMetrics(
        [FromQuery(Name = "user_id")] long? userId,
        [FromQuery(Name = "team_id")] long? teamId,
        [FromQuery(Name = "kpi")] string? kpiCode,
        [FromQuery(Name = "range")] string? range,
        CancellationToken cancellationToken)
    {
        DateTimeOffset? rangeStart = null;
        DateTimeOffset? rangeEnd = null;

        if (!string.IsNullOrWhiteSpace(range))
        {
            // Parse range (e.g., "2025-01-01,2025-01-31" or "last30days", "last7days", "last90days")
            if (range.Contains(','))
            {
                var parts = range.Split(',');
                if (parts.Length == 2 &&
                    DateTimeOffset.TryParse(parts[0], out var start) &&
                    DateTimeOffset.TryParse(parts[1], out var end))
                {
                    rangeStart = start;
                    rangeEnd = end;
                }
            }
            else
            {
                var rangeLower = range.ToLower();
                rangeEnd = DateTimeOffset.UtcNow;
                rangeStart = rangeLower switch
                {
                    "last7days" => rangeEnd.Value.AddDays(-7),
                    "last30days" => rangeEnd.Value.AddDays(-30),
                    "last90days" => rangeEnd.Value.AddDays(-90),
                    _ => null // If unknown range, don't filter by date
                };
            }
        }

        var query = new MetricsQuery(userId, teamId, kpiCode, rangeStart, rangeEnd);
        var snapshot = await metricsService.GetSnapshotAsync(query, cancellationToken);
        return Ok(snapshot);
    }

    [HttpGet("metrics/timeseries")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyCollection<MetricsTimeSeriesResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<MetricsTimeSeriesResponse>>> GetTimeSeries(
        [FromQuery(Name = "user_id")] long? userId,
        [FromQuery(Name = "team_id")] long? teamId,
        [FromQuery(Name = "kpi")] string? kpiCode,
        [FromQuery(Name = "range")] string? range,
        CancellationToken cancellationToken)
    {
        DateTimeOffset? rangeStart = null;
        DateTimeOffset? rangeEnd = null;

        if (!string.IsNullOrWhiteSpace(range))
        {
            if (range.Contains(','))
            {
                var parts = range.Split(',');
                if (parts.Length == 2 &&
                    DateTimeOffset.TryParse(parts[0], out var start) &&
                    DateTimeOffset.TryParse(parts[1], out var end))
                {
                    rangeStart = start;
                    rangeEnd = end;
                }
            }
            else
            {
                var rangeLower = range.ToLower();
                rangeEnd = DateTimeOffset.UtcNow;
                rangeStart = rangeLower switch
                {
                    "last7days" => rangeEnd.Value.AddDays(-7),
                    "last30days" => rangeEnd.Value.AddDays(-30),
                    "last90days" => rangeEnd.Value.AddDays(-90),
                    _ => null // If unknown range, don't filter by date
                };
            }
        }

        var query = new MetricsQuery(userId, teamId, kpiCode, rangeStart, rangeEnd);
        var timeSeries = await metricsService.GetTimeSeriesAsync(query, cancellationToken);
        return Ok(timeSeries);
    }

    [HttpPost("targets")]
    [Authorize]
    [ProducesResponseType(typeof(KpiTargetResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<KpiTargetResponse>> CreateTarget(
        [FromBody] CreateKpiTargetRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        var actorId = await User.GetActorIdAsync(dbContext, cancellationToken);

        if (actorId == 0)
        {
            return Unauthorized("Unable to determine user ID from token.");
        }

        var target = await kpiTargetService.CreateAsync(request, actorId, cancellationToken);
        return CreatedAtAction(nameof(CreateTarget), new { targetId = target.TargetId }, target);
    }

    [HttpPost("kpis")]
    [Authorize]
    [ProducesResponseType(typeof(KpiResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<KpiResponse>> CreateKpi(
        [FromBody] CreateKpiRequest request,
        CancellationToken cancellationToken)
    {
        var kpi = await kpiService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetKpis), new { kpiId = kpi.KpiId }, kpi);
    }

    [HttpGet("kpis")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyCollection<KpiResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<KpiResponse>>> GetKpis(
        CancellationToken cancellationToken)
    {
        var kpis = await kpiService.GetAllAsync(cancellationToken);
        return Ok(kpis);
    }

    [HttpGet("kpis/{kpiId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(KpiResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<KpiResponse>> GetKpi(
        Guid kpiId,
        CancellationToken cancellationToken)
    {
        var kpi = await kpiService.GetByIdAsync(kpiId, cancellationToken);
        if (kpi == null)
        {
            return NotFound($"KPI {kpiId} not found");
        }
        return Ok(kpi);
    }
}

