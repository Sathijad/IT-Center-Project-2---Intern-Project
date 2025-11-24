using Schedules.Domain.Enums;
using TaskStatusEnum = Schedules.Domain.Enums.TaskStatus;

namespace Schedules.Contracts.Tasks;

public record TaskResponse(
    Guid TaskId,
    string Title,
    string? Description,
    long AssigneeId,
    Guid? ScheduleId,
    TaskPriority Priority,
    TaskStatusEnum Status,
    DateTimeOffset? DueDate,
    string[] Tags,
    string? MsGraphItemId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyCollection<TaskNoteResponse> Notes);

public record TaskNoteResponse(Guid NoteId, long AuthorId, string Body, DateTimeOffset CreatedAt);

public record TaskQuery(long? Assignee, string? Status, int Page = 1, int Size = 20);

public record CreateTaskRequest(
    string Title,
    string? Description,
    long AssigneeId,
    Guid? ScheduleId,
    TaskPriority Priority,
    DateTimeOffset? DueDate,
    string[] Tags);

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    TaskPriority? Priority,
    TaskStatusEnum? Status,
    DateTimeOffset? DueDate,
    string[]? Tags);

public record CreateTaskNoteRequest(string Body);

