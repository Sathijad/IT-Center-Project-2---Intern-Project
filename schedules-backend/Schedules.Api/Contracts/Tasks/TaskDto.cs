using TaskPriority = Schedules.Api.Domain.Enums.TaskPriority;
using TaskStatusEnum = Schedules.Api.Domain.Enums.TaskStatus;

namespace Schedules.Api.Contracts.Tasks;

public record TaskDto(
    Guid TaskId,
    string Title,
    string? Description,
    TaskPriority Priority,
    TaskStatusEnum Status,
    DateTime? DueDate,
    long AssigneeId,
    long ReporterId,
    Guid? ScheduleId,
    string? Metadata,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyCollection<TaskNoteDto> Notes);

public record TaskNoteDto(Guid NoteId, Guid TaskId, long AuthorId, string Body, string? Attachments, DateTime CreatedAt);

