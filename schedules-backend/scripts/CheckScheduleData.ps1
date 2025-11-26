# Check schedule data in RDS
param(
    [string]$Host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com",
    [string]$Database = "itcenter_auth",
    [string]$Username = "postgres",
    [string]$Password = "password"
)

$connectionString = "Host=$Host;Port=5432;Database=$Database;Username=$Username;Password=$Password;SSL Mode=Require;Trust Server Certificate=true"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Schedule Data in RDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$checkScript = @"
using System;
using System.Threading.Tasks;
using Npgsql;

class CheckSchedules
{
    static async Task Main()
    {
        var connString = "$connectionString";
        
        try
        {
            using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            
            Console.WriteLine("✅ Connected to RDS");
            Console.WriteLine("");
            
            // Check total count
            using var countCmd = new NpgsqlCommand("SELECT COUNT(*) FROM schedules", conn);
            var totalCount = await countCmd.ExecuteScalarAsync();
            Console.WriteLine($"Total schedules in database: {totalCount}");
            Console.WriteLine("");
            
            if (Convert.ToInt64(totalCount) == 0)
            {
                Console.WriteLine("⚠️  No schedules found in database.");
                Console.WriteLine("This means:");
                Console.WriteLine("  1. No data was created yet, OR");
                Console.WriteLine("  2. Data was created before tables existed, OR");
                Console.WriteLine("  3. Data was created before connection string was fixed");
                return;
            }
            
            // Show all schedules
            Console.WriteLine("All schedules in database:");
            Console.WriteLine("-------------------------");
            using var cmd = new NpgsqlCommand(@"
                SELECT 
                    schedule_id, 
                    user_id, 
                    team_id, 
                    title, 
                    start_time, 
                    end_time,
                    created_at
                FROM schedules 
                ORDER BY created_at DESC 
                LIMIT 20
            ", conn);
            
            using var reader = await cmd.ExecuteReaderAsync();
            var hasData = false;
            while (await reader.ReadAsync())
            {
                hasData = true;
                var scheduleId = reader.GetGuid(0);
                var userId = reader.GetInt64(1);
                var teamId = reader.IsDBNull(2) ? "NULL" : reader.GetInt64(2).ToString();
                var title = reader.GetString(3);
                var startTime = reader.GetDateTimeOffset(4);
                var endTime = reader.GetDateTimeOffset(5);
                var createdAt = reader.GetDateTimeOffset(6);
                
                Console.WriteLine($"  Schedule ID: {scheduleId}");
                Console.WriteLine($"    User ID: {userId}");
                Console.WriteLine($"    Team ID: {teamId}");
                Console.WriteLine($"    Title: {title}");
                Console.WriteLine($"    Start: {startTime:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine($"    End: {endTime:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine($"    Created: {createdAt:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine("");
            }
            
            if (!hasData)
            {
                Console.WriteLine("  (No schedules found)");
            }
            
            // Check with your query parameters
            Console.WriteLine("");
            Console.WriteLine("Checking with your query parameters:");
            Console.WriteLine("  UserId=1, TeamId=10, RangeStart=2025-01-15T10:00:00Z, RangeEnd=2025-01-15T11:00:00Z");
            Console.WriteLine("-----------------------------------");
            
            using var queryCmd = new NpgsqlCommand(@"
                SELECT COUNT(*) 
                FROM schedules 
                WHERE user_id = @userId 
                  AND team_id = @teamId 
                  AND start_time < @rangeEnd 
                  AND end_time > @rangeStart
            ", conn);
            
            queryCmd.Parameters.AddWithValue("userId", 1L);
            queryCmd.Parameters.AddWithValue("teamId", 10L);
            queryCmd.Parameters.AddWithValue("rangeStart", new DateTimeOffset(2025, 1, 15, 10, 0, 0, TimeSpan.Zero));
            queryCmd.Parameters.AddWithValue("rangeEnd", new DateTimeOffset(2025, 1, 15, 11, 0, 0, TimeSpan.Zero));
            
            var matchingCount = await queryCmd.ExecuteScalarAsync();
            Console.WriteLine($"Matching schedules: {matchingCount}");
            
            if (Convert.ToInt64(matchingCount) == 0)
            {
                Console.WriteLine("");
                Console.WriteLine("💡 Why no results?");
                Console.WriteLine("  Your query filters are very specific:");
                Console.WriteLine("  • UserId must be exactly 1");
                Console.WriteLine("  • TeamId must be exactly 10");
                Console.WriteLine("  • Schedule must overlap with 2025-01-15 10:00-11:00 UTC");
                Console.WriteLine("");
                Console.WriteLine("  Try querying without filters to see all data:");
                Console.WriteLine("  GET /api/v1/schedules (no query parameters)");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
            Environment.Exit(1);
        }
    }
}
"@

$tempFile = "temp_check_schedules.cs"
$checkScript | Out-File -FilePath $tempFile -Encoding UTF8

$tempDir = "temp_check_schedules"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

$csproj = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="8.0.5" />
  </ItemGroup>
</Project>
"@
$csproj | Out-File -FilePath "$tempDir\CheckSchedules.csproj" -Encoding UTF8
Move-Item $tempFile "$tempDir\Program.cs" -ErrorAction SilentlyContinue

Push-Location $tempDir
try {
    dotnet run -q
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

