using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Schedules.Api.Contracts;
using Schedules.Api.Contracts.Tasks;
using Schedules.Api.Data;
using Schedules.Api.Domain.Entities;
using Schedules.Api.Infrastructure.Exceptions;
using Schedules.Api.Integrations;
using Schedules.Api.Options;
using TaskStatusEnum = Schedules.Api.Domain.Enums.TaskStatus;

namespace Schedules.Api.Services;

public interface ITaskService
{
    Task<PagedResponse<TaskDto>> GetAsync(long? assigneeId, string? status, int page, int size, CancellationToken token);
    Task<TaskDto> CreateAsync(CreateTaskRequest request, long reporterId, CancellationToken token);
    Task<TaskDto> UpdateAsync(Guid taskId, UpdateTaskRequest request, CancellationToken token);
    Task<TaskNoteDto> AddCommentAsync(Guid taskId, CreateTaskCommentRequest request, long authorId, CancellationToken token);
}

public class TaskService(AppDbContext dbContext, IMapper mapper, ILogger<TaskService> logger, IOptionsMonitor<FeatureFlagOptions> flagOptions, IFeatureFlagService featureFlagService, ITeamsNotifier teamsNotifier) : ITaskService
{
    private FeatureFlagOptions Flags => flagOptions.CurrentValue;

    public async Task<PagedResponse<TaskDto>> GetAsync(long? assigneeId, string? status, int page, int size, CancellationToken token)
    {
        var query = dbContext.Tasks.Include(t => t.Notes).AsQueryable();

        if (assigneeId.HasValue)
        {
            query = query.Where(t => t.AssigneeId == assigneeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TaskStatusEnum>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        query = query.OrderBy(t => t.DueDate ?? DateTime.MaxValue);

        var total = await query.CountAsync(token);
        var data = await query.Skip((page - 1) * size).Take(size)
            .ProjectTo<TaskDto>(mapper.ConfigurationProvider)
            .ToListAsync(token);

        return new PagedResponse<TaskDto>(data, page, size, total);
    }

    public async Task<TaskDto> CreateAsync(CreateTaskRequest request, long reporterId, CancellationToken token)
    {
        var entity = new TaskEntity
        {
            TaskId = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            DueDate = request.DueDate,
            AssigneeId = request.AssigneeId,
            ReporterId = reporterId,
            ScheduleId = request.ScheduleId,
            Metadata = request.Metadata,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Tasks.Add(entity);
        await dbContext.SaveChangesAsync(token);

        if (featureFlagService.IsTaskNotificationEnabled())
        {
            await teamsNotifier.SendTaskAssignedAsync(entity.TaskId, entity.AssigneeId, token);
        }

        logger.LogInformation("Task {TaskId} created by {Reporter}", entity.TaskId, reporterId);
        return await LoadTaskAsync(entity.TaskId, token);
    }

    public async Task<TaskDto> UpdateAsync(Guid taskId, UpdateTaskRequest request, CancellationToken token)
    {
        var entity = await dbContext.Tasks.Include(t => t.Notes)
            .FirstOrDefaultAsync(t => t.TaskId == taskId, token)
            ?? throw new NotFoundException($"Task {taskId} not found");

        entity.Title = request.Title ?? entity.Title;
        entity.Description = request.Description ?? entity.Description;
        entity.Priority = request.Priority ?? entity.Priority;
        entity.Status = request.Status ?? entity.Status;
        entity.DueDate = request.DueDate ?? entity.DueDate;
        entity.AssigneeId = request.AssigneeId ?? entity.AssigneeId;
        entity.Metadata = request.Metadata ?? entity.Metadata;
        entity.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(token);
        return mapper.Map<TaskDto>(entity);
    }

    public async Task<TaskNoteDto> AddCommentAsync(Guid taskId, CreateTaskCommentRequest request, long authorId, CancellationToken token)
    {
        if (!Flags.EnableMobileTaskComments)
        {
            throw new ApiException("FEATURE_DISABLED", "Task comments are disabled by feature flag.");
        }

        var taskExists = await dbContext.Tasks.AnyAsync(t => t.TaskId == taskId, token);
        if (!taskExists)
        {
            throw new NotFoundException($"Task {taskId} not found");
        }

        var note = new TaskNote
        {
            NoteId = Guid.NewGuid(),
            TaskId = taskId,
            AuthorId = authorId,
            Body = request.Body,
            Attachments = request.Attachments is null ? null : System.Text.Json.JsonSerializer.Serialize(request.Attachments),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.TaskNotes.Add(note);
        await dbContext.SaveChangesAsync(token);

        logger.LogInformation("Comment {NoteId} added to task {TaskId}", note.NoteId, taskId);
        return mapper.Map<TaskNoteDto>(note);
    }

    private async Task<TaskDto> LoadTaskAsync(Guid taskId, CancellationToken token)
    {
        var entity = await dbContext.Tasks.Include(t => t.Notes)
            .FirstAsync(t => t.TaskId == taskId, token);
        return mapper.Map<TaskDto>(entity);
    }
}

