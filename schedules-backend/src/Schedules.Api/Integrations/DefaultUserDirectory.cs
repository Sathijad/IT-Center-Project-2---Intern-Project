namespace Schedules.Integrations;

public class DefaultUserDirectory : IUserDirectory
{
    public Task<string> GetUserPrincipalNameAsync(long userId, CancellationToken cancellationToken)
    {
        // Placeholder – replace with actual lookup from app_users table or directory service.
        return Task.FromResult($"user{userId}@itcenter.internal");
    }
}

