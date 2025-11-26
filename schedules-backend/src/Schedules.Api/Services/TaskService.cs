using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts;
using Schedules.Contracts.Tasks;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using Schedules.Errors;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;

namespace Schedules.Services;

public class TaskService(SchedulesDbContext dbContext, IMapper mapper) : ITaskService
{
    public async Task<PagedResult<TaskResponse>> GetAsync(TaskQuery query, CancellationToken cancellationToken)
    {
        // Build base query for filtering (without Include for count)
        var countQuery = dbContext.Tasks.AsNoTracking();
        var dataQuery = dbContext.Tasks.AsNoTracking();

        if (query.Assignee.HasValue)
        {
            countQuery = countQuery.Where(t => t.AssigneeId == query.Assignee);
            dataQuery = dataQuery.Where(t => t.AssigneeId == query.Assignee);
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && Enum.TryParse<Schedules.Domain.Enums.TaskStatus>(query.Status, true, out var parsedStatus))
        {
            countQuery = countQuery.Where(t => t.Status == parsedStatus);
            dataQuery = dataQuery.Where(t => t.Status == parsedStatus);
        }

        // Count without Include (more efficient)
        var total = await countQuery.CountAsync(cancellationToken);

        // Include Notes only when fetching data
        var tasks = await dataQuery
            .Include(t => t.Notes)
            .OrderBy(t => t.DueDate ?? t.CreatedAt)
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ToListAsync(cancellationToken);

        var items = mapper.Map<List<TaskResponse>>(tasks);

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
        try
        {
            Console.WriteLine($"[TaskService.UpdateAsync] Updating task {taskId}");
            
            var entity = await dbContext.Tasks.Include(t => t.Notes)
                .FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);

            if (entity is null)
            {
                Console.WriteLine($"[TaskService.UpdateAsync] Task {taskId} not found");
                throw new NotFoundException($"Task {taskId} not found");
            }

            Console.WriteLine($"[TaskService.UpdateAsync] Found task: {entity.Title}");

            if (request.Title is not null)
            {
                entity.Title = request.Title;
                Console.WriteLine($"[TaskService.UpdateAsync] Updated Title: {request.Title}");
            }

            if (request.Description is not null)
            {
                entity.Description = request.Description;
            }

            if (request.Priority.HasValue)
            {
                entity.Priority = request.Priority.Value;
                Console.WriteLine($"[TaskService.UpdateAsync] Updated Priority: {request.Priority.Value}");
            }

            if (request.Status.HasValue)
            {
                entity.Status = request.Status.Value;
                Console.WriteLine($"[TaskService.UpdateAsync] Updated Status: {request.Status.Value}");
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
            Console.WriteLine($"[TaskService.UpdateAsync] Saving changes...");
            
            await dbContext.SaveChangesAsync(cancellationToken);
            
            Console.WriteLine($"[TaskService.UpdateAsync] ✅ Changes saved successfully");

            // Reload to ensure Notes are included in mapping
            await dbContext.Entry(entity)
                .Collection(e => e.Notes)
                .Query()
                .LoadAsync(cancellationToken);

            Console.WriteLine($"[TaskService.UpdateAsync] Mapping to response...");
            var response = mapper.Map<TaskResponse>(entity);
            Console.WriteLine($"[TaskService.UpdateAsync] ✅ Mapping completed");

            return response;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TaskService.UpdateAsync] ❌ ERROR: {ex.Message}");
            Console.WriteLine($"[TaskService.UpdateAsync] Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[TaskService.UpdateAsync] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TaskService.UpdateAsync] Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }
    }

    public async Task<TaskResponse> AddNoteAsync(Guid taskId, CreateTaskNoteRequest request, long actorId, CancellationToken cancellationToken)
    {
        try
        {
            Console.WriteLine($"[TaskService.AddNoteAsync] Adding note to task {taskId}");
            
            var entity = await dbContext.Tasks.Include(t => t.Notes)
                .FirstOrDefaultAsync(t => t.TaskItemId == taskId, cancellationToken);

            if (entity is null)
            {
                Console.WriteLine($"[TaskService.AddNoteAsync] Task {taskId} not found");
                throw new NotFoundException($"Task {taskId} not found");
            }

            Console.WriteLine($"[TaskService.AddNoteAsync] Found task: {entity.Title}");

            var note = new TaskNote
            {
                TaskNoteId = Guid.NewGuid(),
                TaskItemId = taskId,
                AuthorId = actorId,
                Body = request.Body,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            Console.WriteLine($"[TaskService.AddNoteAsync] Created new note with ID: {note.TaskNoteId}");

            // Explicitly add to DbSet to ensure it's tracked as a new entity
            dbContext.TaskNotes.Add(note);
            
            Console.WriteLine($"[TaskService.AddNoteAsync] Saving note...");
            await dbContext.SaveChangesAsync(cancellationToken);
            
            Console.WriteLine($"[TaskService.AddNoteAsync] ✅ Note saved successfully");

            // Reload task with notes to include the new note in response
            await dbContext.Entry(entity)
                .Collection(e => e.Notes)
                .Query()
                .LoadAsync(cancellationToken);

            Console.WriteLine($"[TaskService.AddNoteAsync] Mapping to response...");
            var response = mapper.Map<TaskResponse>(entity);
            Console.WriteLine($"[TaskService.AddNoteAsync] ✅ Mapping completed");

            return response;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TaskService.AddNoteAsync] ❌ ERROR: {ex.Message}");
            Console.WriteLine($"[TaskService.AddNoteAsync] Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[TaskService.AddNoteAsync] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TaskService.AddNoteAsync] Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }
    }
}

