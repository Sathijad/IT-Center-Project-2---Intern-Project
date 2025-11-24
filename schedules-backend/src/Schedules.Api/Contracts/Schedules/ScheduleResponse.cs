using Schedules.Domain.Enums;

namespace Schedules.Contracts.Schedules;

public record RecurrenceDto(
    Guid? RecurrenceId,
    string? Pattern,
    int? Interval,
    string? ByDay,
    string? ByMonthDay,
    DateTimeOffset? Until);

public record ScheduleResponse(
    Guid ScheduleId,
    long UserId,
    long? TeamId,
    string Title,
    string? Description,
    DateTimeOffset StartTime,
    DateTimeOffset EndTime,
    bool IsAllDay,
    ScheduleSource Source,
    ScheduleStatus Status,
    string? CalendarEventId,
    RecurrenceDto? Recurrence,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

