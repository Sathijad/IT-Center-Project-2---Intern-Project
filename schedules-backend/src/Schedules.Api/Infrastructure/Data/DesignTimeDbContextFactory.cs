using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Schedules.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<SchedulesDbContext>
{
    public SchedulesDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SchedulesDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("SCHEDULES_DB_CONNECTION")
                               ?? "Host=localhost;Port=5432;Database=it_center_schedules;Username=postgres;Password=postgres";

        optionsBuilder.UseNpgsql(connectionString);
        return new SchedulesDbContext(optionsBuilder.Options);
    }
}

