namespace Performance.Integrations;

public interface IMsGraphClient
{
    Task<string?> CreateTeamsMeetingAsync(string userPrincipalName, string subject, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken);
}

