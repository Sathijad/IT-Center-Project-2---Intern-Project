using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Schedules.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<SchedulesDbContext>
{
    public SchedulesDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SchedulesDbContext>();
        
        // Try environment variable first
        var connectionString = Environment.GetEnvironmentVariable("SCHEDULES_DB_CONNECTION");
        
        // If not in env var, try reading from appsettings (for design-time)
        if (string.IsNullOrEmpty(connectionString))
        {
            // Get the project directory (where appsettings files are located)
            var projectDir = Path.GetDirectoryName(Path.GetDirectoryName(Path.GetDirectoryName(Path.GetDirectoryName(typeof(DesignTimeDbContextFactory).Assembly.Location))));
            var appsettingsPath = Path.Combine(projectDir ?? Directory.GetCurrentDirectory(), "appsettings.Development.json");
            
            var configuration = new ConfigurationBuilder()
                .SetBasePath(projectDir ?? Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddJsonFile("appsettings.json", optional: true)
                .AddEnvironmentVariables()
                .Build();
            
            connectionString = configuration.GetConnectionString("SchedulesDb");
        }
        
        // Final fallback - use itcenter_auth database (shared with other phases)
        if (string.IsNullOrEmpty(connectionString))
        {
            connectionString = "Host=localhost;Port=5432;Database=itcenter_auth;Username=itcenter;Password=password";
        }

        optionsBuilder.UseNpgsql(connectionString);
        return new SchedulesDbContext(optionsBuilder.Options);
    }
}

