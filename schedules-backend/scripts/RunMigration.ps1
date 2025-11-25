# Phase 4 SQL Migration Runner
# Uses .NET with Npgsql to execute the SQL migration on RDS

param(
    [string]$Host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com",
    [int]$Port = 5432,
    [string]$Database = "itcenter_auth",
    [string]$Username = "postgres",
    [string]$Password = "password",
    [string]$SqlFile = "migrations\20251125_phase4_schedules.sql"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4 SQL Migration Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SQL file exists
if (-not (Test-Path $SqlFile)) {
    Write-Host "❌ ERROR: SQL file not found: $SqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SQL file found: $SqlFile" -ForegroundColor Green
Write-Host "📊 File size: $((Get-Item $SqlFile).Length) bytes" -ForegroundColor Gray
Write-Host ""

# Read SQL content
$sqlContent = Get-Content $SqlFile -Raw
Write-Host "📝 SQL content loaded ($($sqlContent.Length) characters)" -ForegroundColor Gray
Write-Host ""

# Create a temporary C# script to run the migration
$csharpCode = @"
using System;
using System.IO;
using System.Threading.Tasks;
using Npgsql;

class MigrationRunner
{
    static async Task Main(string[] args)
    {
        var host = "$Host";
        var port = $Port;
        var database = "$Database";
        var username = "$Username";
        var password = "$Password";
        var sqlFile = "$SqlFile";
        
        var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;Timeout=30";
        
        Console.WriteLine("Connecting to RDS...");
        Console.WriteLine($"Host: {host}");
        Console.WriteLine($"Database: {database}");
        Console.WriteLine("");
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            Console.WriteLine("✅ Connected to RDS successfully!");
            Console.WriteLine("");
            
            Console.WriteLine("Reading SQL file...");
            var sql = File.ReadAllText(sqlFile);
            Console.WriteLine($"✅ SQL file read ({sql.Length} characters)");
            Console.WriteLine("");
            
            Console.WriteLine("Executing migration...");
            Console.WriteLine("This may take a few seconds...");
            Console.WriteLine("");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.CommandTimeout = 120; // 2 minutes timeout
            
            var result = await cmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("✅ Migration executed successfully!");
            Console.WriteLine("");
            
            // Verify tables were created
            Console.WriteLine("Verifying tables...");
            var verifySql = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_name IN ('schedules', 'tasks', 'task_notes', 'recurrences', 'import_jobs')
                ORDER BY table_name;
            ";
            
            using var verifyCmd = new NpgsqlCommand(verifySql, conn);
            using var reader = await verifyCmd.ExecuteReaderAsync();
            
            var tables = new System.Collections.Generic.List<string>();
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(0));
            }
            
            Console.WriteLine("");
            if (tables.Count == 5)
            {
                Console.WriteLine("✅ All 5 Phase 4 tables created successfully:");
                foreach (var table in tables)
                {
                    Console.WriteLine($"   - {table}");
                }
            }
            else
            {
                Console.WriteLine($"⚠️  Warning: Expected 5 tables, found {tables.Count}");
                foreach (var table in tables)
                {
                    Console.WriteLine($"   - {table}");
                }
            }
            
            Console.WriteLine("");
            Console.WriteLine("✅ Migration completed successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine("");
            Console.WriteLine($"❌ ERROR: {ex.Message}");
            Console.WriteLine("");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
            Environment.Exit(1);
        }
    }
}
"@

# Write C# code to temp file
$tempCsFile = "temp_migration_runner.cs"
$csharpCode | Out-File -FilePath $tempCsFile -Encoding UTF8

Write-Host "🔧 Creating migration runner..." -ForegroundColor Yellow

# Check if we can use dotnet-script or need to compile
$useDotnetScript = $false
try {
    $null = Get-Command dotnet-script -ErrorAction Stop
    $useDotnetScript = $true
} catch {
    # dotnet-script not available, will compile manually
}

if ($useDotnetScript) {
    Write-Host "Using dotnet-script..." -ForegroundColor Gray
    dotnet-script $tempCsFile
} else {
    # Create a simple console app
    Write-Host "Creating temporary .NET project..." -ForegroundColor Gray
    
    $tempDir = "temp_migration_runner"
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Create .csproj
    $csprojContent = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="8.0.5" />
  </ItemGroup>
</Project>
"@
    $csprojContent | Out-File -FilePath "$tempDir\MigrationRunner.csproj" -Encoding UTF8
    
    # Move C# file
    Move-Item $tempCsFile "$tempDir\Program.cs"
    
    Write-Host "Building migration runner..." -ForegroundColor Gray
    Push-Location $tempDir
    try {
        dotnet build -c Release -q
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build successful!" -ForegroundColor Green
            Write-Host ""
            dotnet run -c Release --no-build
        } else {
            Write-Host "❌ Build failed!" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }
}

# Cleanup
if (Test-Path $tempCsFile) {
    Remove-Item $tempCsFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration process completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

