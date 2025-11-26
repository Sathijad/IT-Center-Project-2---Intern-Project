using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts;
using Schedules.Contracts.Schedules;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using Schedules.Errors;
using Schedules.Infrastructure.Data;
using Schedules.Services.Interfaces;

namespace Schedules.Services;

public class ScheduleService(SchedulesDbContext dbContext, IMapper mapper) : IScheduleService
{
    public async Task<PagedResult<ScheduleResponse>> GetAsync(ScheduleQuery query, CancellationToken cancellationToken)
    {
        try
        {
            // Build base query for filtering (without Include for count)
            var countQuery = dbContext.Schedules.AsNoTracking();
            var dataQuery = dbContext.Schedules.AsNoTracking();

            if (query.UserId.HasValue)
            {
                countQuery = countQuery.Where(s => s.UserId == query.UserId);
                dataQuery = dataQuery.Where(s => s.UserId == query.UserId);
            }

            if (query.TeamId.HasValue)
            {
                countQuery = countQuery.Where(s => s.TeamId == query.TeamId);
                dataQuery = dataQuery.Where(s => s.TeamId == query.TeamId);
            }

            if (query.RangeStart.HasValue && query.RangeEnd.HasValue)
            {
                countQuery = countQuery.Where(s =>
                    s.StartTime < query.RangeEnd && s.EndTime > query.RangeStart);
                dataQuery = dataQuery.Where(s =>
                    s.StartTime < query.RangeEnd && s.EndTime > query.RangeStart);
            }

            // Count without Include (more efficient)
            Console.WriteLine($"[ScheduleService.GetAsync] Executing count query...");
            var total = await countQuery.CountAsync(cancellationToken);
            Console.WriteLine($"[ScheduleService.GetAsync] Count result: {total}");

            // Include Recurrence only when fetching data
            Console.WriteLine($"[ScheduleService.GetAsync] Executing data query with Include...");
            var schedules = await dataQuery
                .Include(s => s.Recurrence)
                .OrderBy(s => s.StartTime)
                .Skip((query.Page - 1) * query.Size)
                .Take(query.Size)
                .ToListAsync(cancellationToken);
            Console.WriteLine($"[ScheduleService.GetAsync] Retrieved {schedules.Count} schedules");

            // Map to response
            Console.WriteLine($"[ScheduleService.GetAsync] Mapping schedules to response...");
            var items = mapper.Map<List<ScheduleResponse>>(schedules);
            Console.WriteLine($"[ScheduleService.GetAsync] Mapping completed. {items.Count} items mapped");

            return new PagedResult<ScheduleResponse>(items, query.Page, query.Size, total);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ScheduleService.GetAsync] ❌ ERROR: {ex.Message}");
            Console.WriteLine($"[ScheduleService.GetAsync] Exception type: {ex.GetType().Name}");
            Console.WriteLine($"[ScheduleService.GetAsync] Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[ScheduleService.GetAsync] Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"[ScheduleService.GetAsync] Inner stack trace: {ex.InnerException.StackTrace}");
            }
            throw;
        }
    }

    public async Task<ScheduleResponse> CreateAsync(CreateScheduleRequest request, long actorId, CancellationToken cancellationToken)
    {
        await EnsureNoConflicts(request.UserId, request.StartTime, request.EndTime, cancellationToken);

        RecurrencePattern? recurrence = null;
        if (request.CreateRecurrence && request.Recurrence is not null)
        {
            recurrence = new RecurrencePattern
            {
                RecurrencePatternId = Guid.NewGuid(),
                Pattern = request.Recurrence.Pattern,
                Interval = request.Recurrence.Interval,
                ByDay = request.Recurrence.ByDay,
                ByMonthDay = request.Recurrence.ByMonthDay,
                Until = request.Recurrence.Until,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }

        var schedule = new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = request.UserId,
            TeamId = request.TeamId,
            Title = request.Title,
            Description = request.Description,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            IsAllDay = request.IsAllDay,
            Source = ScheduleSource.Internal,
            Status = ScheduleStatus.Confirmed,
            RecurrenceId = recurrence?.RecurrencePatternId,
            Recurrence = recurrence,
            CreatedBy = actorId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Schedules.Add(schedule);
        
        Console.WriteLine($"[ScheduleService] Adding schedule to context: {schedule.ScheduleId}");
        Console.WriteLine($"[ScheduleService] Schedule details: UserId={schedule.UserId}, Title={schedule.Title}, StartTime={schedule.StartTime}");
        
        try
        {
            var savedCount = await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine($"[ScheduleService] ✅ SaveChangesAsync completed. Saved {savedCount} entity/entities");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ScheduleService] ❌ Error saving schedule: {ex.Message}");
            Console.WriteLine($"[ScheduleService] Exception type: {ex.GetType().Name}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[ScheduleService] Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }

        return mapper.Map<ScheduleResponse>(schedule);
    }

    public async Task<ScheduleResponse> UpdateAsync(Guid scheduleId, UpdateScheduleRequest request, CancellationToken cancellationToken)
    {
        var schedule = await dbContext.Schedules
            .Include(s => s.Recurrence)
            .FirstOrDefaultAsync(s => s.ScheduleId == scheduleId, cancellationToken);

        if (schedule is null)
        {
            throw new NotFoundException($"Schedule {scheduleId} not found");
        }

        if (request.Cancel == true)
        {
            schedule.Status = ScheduleStatus.Cancelled;
        }

        if (request.Title is not null)
        {
            schedule.Title = request.Title;
        }

        if (request.Description is not null)
        {
            schedule.Description = request.Description;
        }

        if (request.StartTime.HasValue && request.EndTime.HasValue)
        {
            await EnsureNoConflicts(schedule.UserId, request.StartTime.Value, request.EndTime.Value, cancellationToken, schedule.ScheduleId);
            schedule.StartTime = request.StartTime.Value;
            schedule.EndTime = request.EndTime.Value;
        }

        if (request.IsAllDay.HasValue)
        {
            schedule.IsAllDay = request.IsAllDay.Value;
        }

        if (request.Recurrence is not null)
        {
            if (schedule.Recurrence is null)
            {
                schedule.Recurrence = new RecurrencePattern
                {
                    RecurrencePatternId = Guid.NewGuid()
                };
                schedule.RecurrenceId = schedule.Recurrence.RecurrencePatternId;
            }

            schedule.Recurrence.Pattern = request.Recurrence.Pattern;
            schedule.Recurrence.Interval = request.Recurrence.Interval;
            schedule.Recurrence.ByDay = request.Recurrence.ByDay;
            schedule.Recurrence.ByMonthDay = request.Recurrence.ByMonthDay;
            schedule.Recurrence.Until = request.Recurrence.Until;
        }

        schedule.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return mapper.Map<ScheduleResponse>(schedule);
    }

    public async Task DeleteAsync(Guid scheduleId, CancellationToken cancellationToken)
    {
        var schedule = await dbContext.Schedules.FindAsync([scheduleId], cancellationToken);
        if (schedule is null)
        {
            throw new NotFoundException($"Schedule {scheduleId} not found");
        }

        dbContext.Schedules.Remove(schedule);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureNoConflicts(long userId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken, Guid? excludeId = null)
    {
        var conflictingSchedules = await dbContext.Schedules
            .Where(s => s.UserId == userId && (excludeId == null || s.ScheduleId != excludeId))
            .Where(s => s.StartTime < end && start < s.EndTime)
            .ToListAsync(cancellationToken);

        if (conflictingSchedules.Any())
        {
            Console.WriteLine($"[ScheduleService] ⚠️ Found {conflictingSchedules.Count} conflicting schedule(s):");
            foreach (var conflict in conflictingSchedules)
            {
                Console.WriteLine($"[ScheduleService]   - ScheduleId: {conflict.ScheduleId}, Title: {conflict.Title}, Start: {conflict.StartTime}, End: {conflict.EndTime}");
            }
            throw new ConflictException("Schedule overlaps with an existing entry.");
        }
        
        Console.WriteLine($"[ScheduleService] ✅ No conflicts found for userId={userId}, start={start}, end={end}");
    }
}

