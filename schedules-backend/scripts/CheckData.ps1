# Check data in RDS database
param(
    [string]$Host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com",
    [string]$Database = "itcenter_auth",
    [string]$Username = "postgres",
    [string]$Password = "password"
)

$connectionString = "Host=$Host;Port=5432;Database=$Database;Username=$Username;Password=$Password;SSL Mode=Require;Trust Server Certificate=true"

$sql = @"
SELECT 
    'schedules' AS table_name, COUNT(*) AS row_count FROM schedules
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'task_notes', COUNT(*) FROM task_notes
UNION ALL
SELECT 'recurrences', COUNT(*) FROM recurrences
UNION ALL
SELECT 'import_jobs', COUNT(*) FROM import_jobs
ORDER BY table_name;
"@

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Data in RDS Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create a simple C# script to check data
$checkScript = @"
using System;
using System.Threading.Tasks;
using Npgsql;

class CheckData
{
    static async Task Main()
    {
        var connString = "$connectionString";
        var sql = @"$sql";
        
        try
        {
            using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            
            Console.WriteLine("✅ Connected to RDS database");
            Console.WriteLine("");
            Console.WriteLine("Table Row Counts:");
            Console.WriteLine("-----------------");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            using var reader = await cmd.ExecuteReaderAsync();
            
            var hasData = false;
            while (await reader.ReadAsync())
            {
                var table = reader.GetString(0);
                var count = reader.GetInt64(1);
                if (count > 0)
                {
                    hasData = true;
                }
                Console.WriteLine($"  {table.PadRight(15)} : {count} rows");
            }
            
            Console.WriteLine("");
            if (!hasData)
            {
                Console.WriteLine("⚠️  No data found in any Phase 4 tables.");
                Console.WriteLine("This is expected if:");
                Console.WriteLine("  1. You tested before the migration was run");
                Console.WriteLine("  2. You tested before the connection string was fixed");
                Console.WriteLine("  3. The data was saved to localhost database instead");
            }
            else
            {
                Console.WriteLine("✅ Data found in RDS database!");
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

$tempFile = "temp_check_data.cs"
$checkScript | Out-File -FilePath $tempFile -Encoding UTF8

$tempDir = "temp_check"
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
$csproj | Out-File -FilePath "$tempDir\CheckData.csproj" -Encoding UTF8
Move-Item $tempFile "$tempDir\Program.cs" -ErrorAction SilentlyContinue

Push-Location $tempDir
try {
    dotnet run -q
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}

