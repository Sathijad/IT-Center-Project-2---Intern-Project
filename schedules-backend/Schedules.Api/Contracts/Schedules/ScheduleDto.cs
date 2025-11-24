using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Contracts.Schedules;

public record ScheduleDto(
    Guid ScheduleId,
    long UserId,
    Guid? TeamId,
    DateTime StartTime,
    DateTime EndTime,
    ScheduleStatus Status,
    ScheduleSource Source,
    string? Metadata,
    RecurrenceDto? Recurrence,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record RecurrenceDto(
    Guid RecurrenceId,
    string Pattern,
    short Interval,
    IReadOnlyCollection<string>? ByDay,
    short? BySetPosition,
    DateOnly? RepeatUntil,
    string Timezone);

