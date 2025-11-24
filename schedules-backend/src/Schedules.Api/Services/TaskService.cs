using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts;
using Schedules.Contracts.Tasks;
using Schedules.Domain.Entities;
using Schedules.Errors;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;

namespace Schedules.Services;

public class TaskService(SchedulesDbContext dbContext, IMapper mapper) : ITaskService
{
    public async Task<PagedResult<TaskResponse>> GetAsync(TaskQuery query, CancellationToken cancellationToken)
    {
        var baseQuery = dbContext.Tasks
            .Include(t => t.Notes)
            .AsNoTracking();

        if (query.Assignee.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.AssigneeId == query.Assignee);
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            baseQuery = baseQuery.Where(t => t.Status.ToString().Equals(query.Status, StringComparison.OrdinalIgnoreCase));
        }

        var total = await baseQuery.CountAsync(cancellationToken);
        var items = await baseQuery
            .OrderBy(t => t.DueDate ?? t.CreatedAt)
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ProjectTo<TaskResponse>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new PagedResult<TaskResponse>(items, query.Page, query.Size, total);
    }

    public async Task<TaskResponse> CreateAsync(CreateTaskRequest request, long actorId, CancellationToken cancellationToken)
    {
        var entity = new TaskItem
        {
            TaskItemId = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            AssigneeId = request.AssigneeId,
            ScheduleId = request.ScheduleId,
            Priority = request.Priority,
            Status = Domain.Enums.TaskStatus.Pending,
            DueDate = request.DueDate,
            Tags = request.Tags,
            CreatedBy = actorId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Tasks.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskResponse>(entity);
    }

    public async Task<TaskResponse> UpdateAsync(Guid taskId, UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Tasks.Include(t => t.Notes)
            .FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);

        if (entity is null)
        {
            throw new NotFoundException($"Task {taskId} not found");
        }

        if (request.Title is not null)
        {
            entity.Title = request.Title;
        }

        if (request.Description is not null)
        {
            entity.Description = request.Description;
        }

        if (request.Priority.HasValue)
        {
            entity.Priority = request.Priority.Value;
        }

        if (request.Status.HasValue)
        {
            entity.Status = request.Status.Value;
        }

        if (request.DueDate.HasValue)
        {
            entity.DueDate = request.DueDate.Value;
        }

        if (request.Tags is not null)
        {
            entity.Tags = request.Tags;
        }

        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskResponse>(entity);
    }

    public async Task<TaskResponse> AddNoteAsync(Guid taskId, CreateTaskNoteRequest request, long actorId, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Tasks.Include(t => t.Notes)
            .FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);

        if (entity is null)
        {
            throw new NotFoundException($"Task {taskId} not found");
        }

        var note = new TaskNote
        {
            TaskNoteId = Guid.NewGuid(),
            TaskItemId = taskId,
            AuthorId = actorId,
            Body = request.Body,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        entity.Notes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);

        return mapper.Map<TaskResponse>(entity);
    }
}

