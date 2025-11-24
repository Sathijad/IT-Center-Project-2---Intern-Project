namespace Schedules.Contracts.Availability;

public record AvailabilitySlot(DateTimeOffset Start, DateTimeOffset End, string Source);

public record AvailabilityResponse(long UserId, IReadOnlyCollection<AvailabilitySlot> BusySlots);

