using Schedules.Api.Domain.Enums;

namespace Schedules.Api.Contracts.Schedules;

public record CreateScheduleRequest(
    long UserId,
    Guid? TeamId,
    DateTime StartTime,
    DateTime EndTime,
    ScheduleSource Source,
    string? Metadata,
    RecurrenceUpsertRequest? Recurrence);

public record UpdateScheduleRequest(
    Guid ScheduleId,
    DateTime? StartTime,
    DateTime? EndTime,
    ScheduleStatus? Status,
    string? Metadata);

public record RecurrenceUpsertRequest(
    string Pattern,
    short Interval,
    IReadOnlyCollection<string>? ByDay,
    short? BySetPosition,
    DateOnly? RepeatUntil,
    string Timezone);

