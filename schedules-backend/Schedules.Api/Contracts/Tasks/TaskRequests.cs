using TaskPriority = Schedules.Api.Domain.Enums.TaskPriority;
using TaskStatusEnum = Schedules.Api.Domain.Enums.TaskStatus;

namespace Schedules.Api.Contracts.Tasks;

public record CreateTaskRequest(
    string Title,
    string? Description,
    TaskPriority Priority,
    DateTime? DueDate,
    long AssigneeId,
    Guid? ScheduleId,
    string? Metadata);

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    TaskPriority? Priority,
    TaskStatusEnum? Status,
    DateTime? DueDate,
    long? AssigneeId,
    string? Metadata);

public record CreateTaskCommentRequest(string Body, IReadOnlyCollection<TaskAttachmentRequest>? Attachments);

public record TaskAttachmentRequest(string Name, string Url);

