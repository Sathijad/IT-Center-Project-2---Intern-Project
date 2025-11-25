# Check if user exists in app_users table
# Usage: .\CheckUser.ps1 -CognitoSub "495e04a8-5051-70d0-3e40-4305d8945778"

param(
    [string]$CognitoSub = "495e04a8-5051-70d0-3e40-4305d8945778",
    [string]$Host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com",
    [string]$Database = "itcenter_auth",
    [string]$Username = "postgres",
    [string]$Password = "password"
)

$connectionString = "Host=$Host;Port=5432;Database=$Database;Username=$Username;Password=$Password;SSL Mode=Require;Trust Server Certificate=true"

Write-Host "Checking if user exists in app_users table..." -ForegroundColor Cyan
Write-Host "Cognito Sub: $CognitoSub" -ForegroundColor Gray
Write-Host ""

# Create a simple C# script to check user
$csharpCode = @"
using System;
using System.Threading.Tasks;
using Npgsql;

class CheckUser
{
    static async Task Main(string[] args)
    {
        var connectionString = "$connectionString";
        var cognitoSub = "$CognitoSub";
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            Console.WriteLine("✅ Connected to database");
            Console.WriteLine("");
            
            var sql = "SELECT id, cognito_sub, email, display_name FROM app_users WHERE cognito_sub = @sub";
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("sub", cognitoSub);
            
            using var reader = await cmd.ExecuteReaderAsync();
            
            if (await reader.ReadAsync())
            {
                var id = reader.GetInt64(0);
                var sub = reader.GetString(1);
                var email = reader.IsDBNull(2) ? "N/A" : reader.GetString(2);
                var name = reader.IsDBNull(3) ? "N/A" : reader.GetString(3);
                
                Console.WriteLine("✅ User found in database:");
                Console.WriteLine($"   ID: {id}");
                Console.WriteLine($"   Cognito Sub: {sub}");
                Console.WriteLine($"   Email: {email}");
                Console.WriteLine($"   Display Name: {name}");
                Console.WriteLine("");
                Console.WriteLine("This user ID should work with the schedules API.");
            }
            else
            {
                Console.WriteLine("❌ User NOT found in database!");
                Console.WriteLine("");
                Console.WriteLine("The user needs to be created. Options:");
                Console.WriteLine("1. Log in through the admin portal (http://localhost:5173)");
                Console.WriteLine("   This should create the user via JIT provisioning");
                Console.WriteLine("");
                Console.WriteLine("2. Or manually insert the user:");
                Console.WriteLine("   INSERT INTO app_users (cognito_sub, email, display_name, is_active)");
                Console.WriteLine("   VALUES ('$cognitoSub', 'user@example.com', 'User Name', true);");
                Console.WriteLine("   Then get the ID: SELECT id FROM app_users WHERE cognito_sub = '$cognitoSub';");
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

$tempDir = "temp_check_user"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

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

$csprojContent | Out-File -FilePath "$tempDir\CheckUser.csproj" -Encoding UTF8
$csharpCode | Out-File -FilePath "$tempDir\Program.cs" -Encoding UTF8

Push-Location $tempDir
try {
    dotnet build -c Release -q
    if ($LASTEXITCODE -eq 0) {
        dotnet run -c Release --no-build
    } else {
        Write-Host "❌ Build failed!" -ForegroundColor Red
    }
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}

