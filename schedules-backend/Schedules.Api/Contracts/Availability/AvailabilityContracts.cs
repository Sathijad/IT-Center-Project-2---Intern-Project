namespace Schedules.Api.Contracts.Availability;

public record AvailabilitySlotDto(DateTime StartTime, DateTime EndTime, string Status);

public record GraphSyncRequest(long UserId, string Range);

