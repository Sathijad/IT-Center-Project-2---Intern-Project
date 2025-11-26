# Fix Priority Constraint Script
# Updates the database to allow both 'Critical' and 'Urgent' priority values

param(
    [string]$DbHost = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com",
    [string]$Database = "itcenter_auth",
    [string]$Username = "postgres",
    [string]$Password = "password",
    [string]$SqlFile = "migrations\fix_priority_constraint.sql"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Priority Constraint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SqlFile)) {
    Write-Host "❌ ERROR: SQL file not found: $SqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SQL file found: $SqlFile" -ForegroundColor Green
Write-Host ""

$sqlContent = Get-Content $SqlFile -Raw
$connectionString = "Host=$DbHost;Port=5432;Database=$Database;Username=$Username;Password=$Password;SSL Mode=Require;Trust Server Certificate=true;Timeout=60"

$sqlContentEscaped = $sqlContent -replace '"', '""' -replace '\$', '`$'
$tempScript = @"
using System;
using System.Threading.Tasks;
using Npgsql;

class FixPriority
{
    static async Task Main()
    {
        var connString = "$connectionString";
        var sql = $($sqlContentEscaped);
        
        try
        {
            using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to RDS");
            Console.WriteLine("");
            Console.WriteLine("Executing fix...");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.CommandTimeout = 60;
            await cmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("Priority constraint updated successfully!");
            Console.WriteLine("Database now accepts: Low, Medium, High, Urgent, Critical");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
            if (ex.InnerException != null)
            {
                Console.WriteLine("Inner: " + ex.InnerException.Message);
            }
            Environment.Exit(1);
        }
    }
}
"@

$tempFile = "temp_fix_priority.cs"
$tempFile | Out-File -FilePath $tempFile -Encoding UTF8

$tempDir = "temp_fix_priority"
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
$csproj | Out-File -FilePath "$tempDir\FixPriority.csproj" -Encoding UTF8
Move-Item $tempFile "$tempDir\Program.cs" -ErrorAction SilentlyContinue

Push-Location $tempDir
try {
    dotnet run -q
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

