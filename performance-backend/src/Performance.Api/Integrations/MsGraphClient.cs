using Azure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using Performance.Configuration;

namespace Performance.Integrations;

public class MsGraphClient : IMsGraphClient
{
    private readonly GraphServiceClient _graphClient;

    public MsGraphClient(IOptions<GraphOptions> options)
    {
        var graphOptions = options.Value;
        var credential = new ClientSecretCredential(
            graphOptions.TenantId,
            graphOptions.ClientId,
            graphOptions.ClientSecret);
        _graphClient = new GraphServiceClient(credential, graphOptions.Scopes);
    }

    public async Task<string?> CreateTeamsMeetingAsync(
        string userPrincipalName,
        string subject,
        DateTimeOffset start,
        DateTimeOffset end,
        CancellationToken cancellationToken)
    {
        try
        {
            var onlineMeeting = new Microsoft.Graph.Models.OnlineMeeting
            {
                Subject = subject,
                StartDateTime = start,
                EndDateTime = end
            };

            var meeting = await _graphClient.Users[userPrincipalName].OnlineMeetings
                .PostAsync(onlineMeeting, cancellationToken: cancellationToken);

            return meeting?.JoinWebUrl;
        }
        catch
        {
            return null;
        }
    }
}

