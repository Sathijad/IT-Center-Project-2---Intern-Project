using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Performance.Infrastructure.Data;

namespace Performance.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the app_users.id (actor ID) from the JWT token.
    /// Maps Cognito 'sub' claim to app_users.id via cognito_sub column.
    /// </summary>
    public static string? GetCognitoSub(this ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
    }

    /// <summary>
    /// Gets the app_users.id (actor ID) from the JWT token using DbContext.
    /// Maps Cognito 'sub' claim to app_users.id via cognito_sub column.
    /// </summary>
    public static async Task<long> GetActorIdAsync(
        this ClaimsPrincipal user,
        PerformanceDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var cognitoSub = GetCognitoSub(user);
        if (string.IsNullOrWhiteSpace(cognitoSub))
        {
            return 0;
        }

        // Look up user ID from app_users table using cognito_sub
        // This matches Phase 1's approach: query app_users by cognito_sub
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT id FROM app_users WHERE cognito_sub = @p0 AND is_active = TRUE LIMIT 1";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@p0";
            parameter.Value = cognitoSub;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            if (result != null && result != DBNull.Value)
            {
                return Convert.ToInt64(result);
            }
        }
        finally
        {
            await connection.CloseAsync();
        }

        return 0;
    }
}

