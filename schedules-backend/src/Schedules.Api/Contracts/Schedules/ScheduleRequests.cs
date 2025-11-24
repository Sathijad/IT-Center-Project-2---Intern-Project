namespace Schedules.Contracts.Schedules;

public record ScheduleQuery(long? UserId, long? TeamId, DateTimeOffset? RangeStart, DateTimeOffset? RangeEnd, int Page = 1, int Size = 20);

public record CreateScheduleRequest(
    long UserId,
    long? TeamId,
    string Title,
    string? Description,
    DateTimeOffset StartTime,
    DateTimeOffset EndTime,
    bool IsAllDay,
    bool CreateRecurrence,
    RecurrencePayload? Recurrence);

public record UpdateScheduleRequest(
    string? Title,
    string? Description,
    DateTimeOffset? StartTime,
    DateTimeOffset? EndTime,
    bool? IsAllDay,
    RecurrencePayload? Recurrence,
    bool? Cancel);

public record RecurrencePayload(
    string Pattern,
    int Interval,
    string? ByDay,
    string? ByMonthDay,
    DateTimeOffset? Until);

