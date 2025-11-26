using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Schedules.Infrastructure.Data;

namespace Schedules.Services;

public class RoleService(IDbContextFactory<SchedulesDbContext> dbContextFactory)
{
    public async Task<List<string>> GetUserRolesAsync(string cognitoSub, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // Query to get roles for a user by cognito_sub
        // Join app_users -> user_roles -> roles
        var connection = dbContext.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        
        if (!wasOpen)
        {
            await connection.OpenAsync(cancellationToken);
        }
        
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT r.name 
                FROM app_users u
                INNER JOIN user_roles ur ON u.id = ur.user_id
                INNER JOIN roles r ON ur.role_id = r.id
                WHERE u.cognito_sub = @p0 AND u.is_active = TRUE";
            
            var param = command.CreateParameter();
            param.ParameterName = "@p0";
            param.Value = cognitoSub;
            command.Parameters.Add(param);
            
            var roles = new List<string>();
            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                roles.Add(reader.GetString(0));
            }
            
            // If no roles found, default to EMPLOYEE
            if (roles.Count == 0)
            {
                Console.WriteLine($"[RoleService] No roles found for cognito_sub: '{cognitoSub}', defaulting to EMPLOYEE");
                return new List<string> { "EMPLOYEE" };
            }
            
            Console.WriteLine($"[RoleService] Found {roles.Count} roles for cognito_sub '{cognitoSub}': {string.Join(", ", roles)}");
            return roles;
        }
        finally
        {
            if (!wasOpen && connection.State == System.Data.ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }
}

