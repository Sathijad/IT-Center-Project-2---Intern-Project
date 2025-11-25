using System.Data.Common;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Schedules.Infrastructure.Data;

namespace Schedules.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the app_users.id (actor ID) from the JWT token.
    /// Maps Cognito 'sub' claim to app_users.id via cognito_sub column.
    /// </summary>
    public static long GetActorId(this ClaimsPrincipal principal)
    {
        // First try to find direct user_id claim (if present)
        var directUserId = principal.FindFirst("custom:user_id")?.Value ??
                          principal.FindFirst("employee_id")?.Value;
        
        if (directUserId != null && long.TryParse(directUserId, out var directId))
        {
            return directId;
        }

        // Get Cognito sub claim - try multiple claim types
        // ASP.NET Core might map it differently, so check all possibilities
        var cognitoSub = principal.FindFirst("sub")?.Value
                      ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? principal.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        
        if (string.IsNullOrEmpty(cognitoSub))
        {
            // Debug: log all available claims
            var allClaimTypes = principal.Claims.Select(c => c.Type).ToList();
            Console.WriteLine($"[GetActorIdAsync] Sub claim not found. Available claim types: {string.Join(", ", allClaimTypes)}");
            return 0;
        }
        
        Console.WriteLine($"[GetActorIdAsync] Found sub claim: '{cognitoSub}'");

        // Look up user ID from database using cognito_sub
        // Note: This requires a DbContext, so we'll use a service-based approach
        // For now, return 0 and let the service handle the lookup
        return 0;
    }

    /// <summary>
    /// Gets the app_users.id (actor ID) from the JWT token using DbContext.
    /// Maps Cognito 'sub' claim to app_users.id via cognito_sub column.
    /// </summary>
    public static async Task<long> GetActorIdAsync(this ClaimsPrincipal principal, SchedulesDbContext dbContext, CancellationToken cancellationToken = default)
    {
        // First try to find direct user_id claim (if present)
        var directUserId = principal.FindFirst("custom:user_id")?.Value ??
                          principal.FindFirst("employee_id")?.Value;
        
        if (directUserId != null && long.TryParse(directUserId, out var directId))
        {
            return directId;
        }

        // Get Cognito sub claim - try multiple claim types
        // ASP.NET Core might map it differently, so check all possibilities
        var cognitoSub = principal.FindFirst("sub")?.Value
                      ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? principal.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        
        if (string.IsNullOrEmpty(cognitoSub))
        {
            // Debug: log all available claims
            var allClaimTypes = principal.Claims.Select(c => c.Type).ToList();
            Console.WriteLine($"[GetActorIdAsync] Sub claim not found. Available claim types: {string.Join(", ", allClaimTypes)}");
            return 0;
        }
        
        Console.WriteLine($"[GetActorIdAsync] Found sub claim: '{cognitoSub}'");

        // Look up user ID from app_users table using cognito_sub
        // This matches Phase 1's approach: query app_users by cognito_sub
        // Also matches Phase 3: check is_active = TRUE
        try
        {
            // Use direct connection with proper Npgsql syntax
            // Cast to NpgsqlConnection to use Npgsql-specific features
            var connection = dbContext.Database.GetDbConnection();
            var wasOpen = connection.State == System.Data.ConnectionState.Open;
            
            if (!wasOpen)
            {
                await connection.OpenAsync(cancellationToken);
            }
            
            try
            {
                // Cast to NpgsqlConnection for proper parameter handling
                if (connection is Npgsql.NpgsqlConnection npgsqlConnection)
                {
                    using var command = new Npgsql.NpgsqlCommand(
                        "SELECT id FROM app_users WHERE cognito_sub = @p0 AND is_active = TRUE LIMIT 1",
                        npgsqlConnection);
                    
                    command.Parameters.AddWithValue("@p0", cognitoSub);
                    
                    var result = await command.ExecuteScalarAsync(cancellationToken);
                    
                    if (result != null && result != DBNull.Value)
                    {
                        var userId = Convert.ToInt64(result);
                        Console.WriteLine($"[GetActorIdAsync] ✅ Found user ID {userId} for cognito_sub: '{cognitoSub}'");
                        return userId;
                    }
                }
                else
                {
                    // Fallback for non-Npgsql connections
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT id FROM app_users WHERE cognito_sub = @p0 AND is_active = TRUE LIMIT 1";
                    var param = command.CreateParameter();
                    param.ParameterName = "@p0";
                    param.Value = cognitoSub;
                    command.Parameters.Add(param);
                    
                    var result = await command.ExecuteScalarAsync(cancellationToken);
                    
                    if (result != null && result != DBNull.Value)
                    {
                        var userId = Convert.ToInt64(result);
                        Console.WriteLine($"[GetActorIdAsync] ✅ Found user ID {userId} for cognito_sub: '{cognitoSub}'");
                        return userId;
                    }
                }
                
                // User not found or not active - let's check if user exists at all
                Console.WriteLine($"[GetActorIdAsync] ❌ User not found or not active with cognito_sub: '{cognitoSub}'");
                
                // Debug: Check if user exists without is_active check
                if (connection is Npgsql.NpgsqlConnection npgsqlConn2)
                {
                    using var debugCommand = new Npgsql.NpgsqlCommand(
                        "SELECT id, is_active FROM app_users WHERE cognito_sub = @p0 LIMIT 1",
                        npgsqlConn2);
                    
                    debugCommand.Parameters.AddWithValue("@p0", cognitoSub);
                    
                    using var reader = await debugCommand.ExecuteReaderAsync(cancellationToken);
                    if (await reader.ReadAsync(cancellationToken))
                    {
                        var userId = reader.GetInt64(0);
                        var isActive = reader.GetBoolean(1);
                        Console.WriteLine($"[GetActorIdAsync] ⚠️ User exists (ID: {userId}) but is_active = {isActive}");
                    }
                    else
                    {
                        Console.WriteLine($"[GetActorIdAsync] ⚠️ User does not exist in app_users table with cognito_sub: '{cognitoSub}'");
                    }
                }
                
                return 0;
            }
            finally
            {
                if (!wasOpen && connection.State == System.Data.ConnectionState.Open)
                {
                    await connection.CloseAsync();
                }
            }
        }
        catch (Exception ex)
        {
            // Log error for debugging
            Console.WriteLine($"[GetActorIdAsync] ❌ Error looking up user by cognito_sub '{cognitoSub}': {ex.Message}");
            Console.WriteLine($"[GetActorIdAsync] Exception type: {ex.GetType().Name}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[GetActorIdAsync] Inner exception: {ex.InnerException.Message}");
            }
            Console.WriteLine($"[GetActorIdAsync] Stack trace: {ex.StackTrace}");
            return 0;
        }
    }
}

