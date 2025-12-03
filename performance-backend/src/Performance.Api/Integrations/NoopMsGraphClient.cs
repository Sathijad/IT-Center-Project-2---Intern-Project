namespace Performance.Integrations;

public class NoopMsGraphClient : IMsGraphClient
{
    public Task<string?> CreateTeamsMeetingAsync(string userPrincipalName, string subject, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken)
    {
        return Task.FromResult<string?>(null);
    }
}

