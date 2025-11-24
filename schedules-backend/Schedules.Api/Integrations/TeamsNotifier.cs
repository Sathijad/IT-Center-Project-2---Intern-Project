using System.Text.Json;
using Microsoft.Extensions.Options;
using Schedules.Api.Options;

namespace Schedules.Api.Integrations;

public interface ITeamsNotifier
{
    Task SendTaskAssignedAsync(Guid taskId, long assigneeId, CancellationToken token);
}

public class TeamsNotifier(HttpClient httpClient, IOptions<TeamsOptions> options, ILogger<TeamsNotifier> logger) : ITeamsNotifier
{
    private readonly string _webhookUrl = options.Value.WebhookUrl;

    public async Task SendTaskAssignedAsync(Guid taskId, long assigneeId, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(_webhookUrl))
        {
            logger.LogWarning("Teams webhook not configured, skipping notification");
            return;
        }

        var payload = new
        {
            type = "message",
            summary = "Task Assigned",
            sections = new[]
            {
                new
                {
                    activityTitle = $"Task {taskId} assigned",
                    activitySubtitle = $"Assignee #{assigneeId}",
                    facts = new[]
                    {
                        new { name = "Task Id", value = taskId.ToString() },
                        new { name = "Assignee", value = assigneeId.ToString() }
                    }
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, _webhookUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json")
        };

        var response = await httpClient.SendAsync(request, token);
        response.EnsureSuccessStatusCode();
    }
}

