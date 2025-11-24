using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Schedules.Infrastructure.Data;

namespace Schedules.Health;

public class DatabaseHealthCheck(IDbContextFactory<SchedulesDbContext> contextFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var dbContext = await contextFactory.CreateDbContextAsync(cancellationToken);
            await dbContext.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database unreachable", ex);
        }
    }
}

