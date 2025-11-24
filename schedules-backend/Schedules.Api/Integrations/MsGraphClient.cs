using Microsoft.Extensions.Options;
using Schedules.Api.Contracts.Availability;
using Schedules.Api.Options;

namespace Schedules.Api.Integrations;

public interface IMsGraphClient
{
    Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAvailabilityAsync(long userId, string range, CancellationToken token);
    Task TriggerSyncAsync(long userId, string range, CancellationToken token);
}

public class MsGraphClient : IMsGraphClient
{
    private readonly HttpClient _httpClient;
    private readonly MsGraphOptions _options;
    private readonly ILogger<MsGraphClient> _logger;

    public MsGraphClient(HttpClient httpClient, IOptions<MsGraphOptions> options, ILogger<MsGraphClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAvailabilityAsync(long userId, string range, CancellationToken token)
    {
        // Placeholder implementation; real call would exchange tokens with MS Graph.
        _logger.LogInformation("Fetching availability for user {UserId} range {Range}", userId, range);
        await Task.Delay(50, token);
        var now = DateTime.UtcNow;
        return new[]
        {
            new AvailabilitySlotDto(now, now.AddHours(1), "BUSY"),
            new AvailabilitySlotDto(now.AddHours(1), now.AddHours(2), "FREE")
        };
    }

    public async Task TriggerSyncAsync(long userId, string range, CancellationToken token)
    {
        _logger.LogInformation("Triggering MS Graph sync for user {UserId} range {Range}", userId, range);
        await Task.Delay(50, token);
    }
}

