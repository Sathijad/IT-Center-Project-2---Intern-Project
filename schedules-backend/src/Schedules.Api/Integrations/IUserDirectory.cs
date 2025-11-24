namespace Schedules.Integrations;

public interface IUserDirectory
{
    Task<string> GetUserPrincipalNameAsync(long userId, CancellationToken cancellationToken);
}

