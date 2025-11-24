using System.Net.Http.Json;
using Azure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Schedules.Configuration;
using Schedules.Contracts.Availability;
using Schedules.Domain.Entities;
using Schedules.Integrations.Models;
using ScheduleEntity = Schedules.Domain.Entities.Schedule;

namespace Schedules.Integrations;

public class MsGraphClient : IMsGraphClient
{
    private readonly GraphOptions _options;
    private readonly GraphServiceClient _graphClient;
    private readonly HttpClient _httpClient;

    public MsGraphClient(IOptions<GraphOptions> options, IHttpClientFactory httpClientFactory)
    {
        _options = options.Value;
        var credential = new ClientSecretCredential(_options.TenantId, _options.ClientId, _options.ClientSecret);
        _graphClient = new GraphServiceClient(credential, _options.Scopes);
        _httpClient = httpClientFactory.CreateClient("TeamsWebhook");
    }

    public async Task<IReadOnlyCollection<AvailabilitySlot>> GetAvailabilityAsync(string userPrincipalName, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken)
    {
        var events = await _graphClient.Users[userPrincipalName].CalendarView.GetAsync(requestConfiguration =>
        {
            requestConfiguration.QueryParameters.StartDateTime = start.ToString("o");
            requestConfiguration.QueryParameters.EndDateTime = end.ToString("o");
            requestConfiguration.Headers.Add("Prefer", "outlook.timezone=\"UTC\"");
        }, cancellationToken);

        var slots = events?.Value?
            .Where(e => e?.Start?.DateTime != null && e.End?.DateTime != null)
            .Select(e => new AvailabilitySlot(DateTimeOffset.Parse(e!.Start!.DateTime!), DateTimeOffset.Parse(e.End!.DateTime!), "MS_GRAPH"))
            .ToList() ?? new List<AvailabilitySlot>();

        return slots;
    }

    public async Task<string?> UpsertScheduleAsync(ScheduleEntity schedule, CancellationToken cancellationToken)
    {
        var outlookEvent = new Event
        {
            Subject = schedule.Title,
            Body = new ItemBody { Content = schedule.Description, ContentType = BodyType.Html },
            Start = new DateTimeTimeZone { DateTime = schedule.StartTime.ToString("o"), TimeZone = "UTC" },
            End = new DateTimeTimeZone { DateTime = schedule.EndTime.ToString("o"), TimeZone = "UTC" },
            IsAllDay = schedule.IsAllDay
        };

        var upn = $"user{schedule.UserId}@itcenter.internal";

        if (!string.IsNullOrEmpty(schedule.CalendarEventId))
        {
            await _graphClient.Users[upn].Events[schedule.CalendarEventId].PatchAsync(outlookEvent, cancellationToken: cancellationToken);
            return schedule.CalendarEventId;
        }

        var created = await _graphClient.Users[upn].Events.PostAsync(outlookEvent, cancellationToken: cancellationToken);
        return created?.Id;
    }

    public async Task SendTaskNotificationAsync(TaskItem task, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.NotificationWebhook))
        {
            return;
        }

        var payload = new TeamsWebhookCard
        {
            Title = $"New Task Assigned: {task.Title}",
            Text = task.Description ?? "No description",
            AssigneeId = task.AssigneeId,
            DueDate = task.DueDate
        };

        await _httpClient.PostAsJsonAsync(_options.NotificationWebhook, payload, cancellationToken);
    }
}

