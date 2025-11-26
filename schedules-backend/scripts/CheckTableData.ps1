# Check Phase 4 table row counts in RDS
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
Write-Host "Phase 4 Table Data Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Use the MigrationRunner to execute query
$tempScript = @"
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
            
            using var cmd = new NpgsqlCommand(sql, conn);
            using var reader = await cmd.ExecuteReaderAsync();
            
            Console.WriteLine("Table Row Counts:");
            Console.WriteLine("-----------------");
            while (await reader.ReadAsync())
            {
                var table = reader.GetString(0);
                var count = reader.GetInt64(1);
                Console.WriteLine($"  {table.PadRight(15)} : {count} rows");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }
}
"@

$tempFile = "temp_check_data.cs"
$tempFile | Out-File -FilePath $tempFile -Encoding UTF8 -ErrorAction SilentlyContinue

# Try to use existing MigrationRunner project structure
$projPath = "scripts\MigrationRunner.csproj"
if (Test-Path $projPath) {
    # Compile and run
    Push-Location scripts
    try {
        dotnet run --no-build 2>$null
        if ($LASTEXITCODE -ne 0) {
            # Need to compile first
            dotnet build -q
            dotnet run --no-build 2>$null
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Creating temporary runner..." -ForegroundColor Yellow
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
}

Remove-Item $tempFile -ErrorAction SilentlyContinue

