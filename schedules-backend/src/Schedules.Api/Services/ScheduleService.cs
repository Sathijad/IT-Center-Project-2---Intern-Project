using AutoMapper;
using AutoMapper.QueryableExtensions;
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
        var baseQuery = dbContext.Schedules.AsNoTracking();

        if (query.UserId.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.UserId == query.UserId);
        }

        if (query.TeamId.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.TeamId == query.TeamId);
        }

        if (query.RangeStart.HasValue && query.RangeEnd.HasValue)
        {
            baseQuery = baseQuery.Where(s =>
                s.StartTime < query.RangeEnd && s.EndTime > query.RangeStart);
        }

        baseQuery = baseQuery.Include(s => s.Recurrence);

        var total = await baseQuery.CountAsync(cancellationToken);
        var items = await baseQuery
            .OrderBy(s => s.StartTime)
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ProjectTo<ScheduleResponse>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new PagedResult<ScheduleResponse>(items, query.Page, query.Size, total);
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
        await dbContext.SaveChangesAsync(cancellationToken);

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
        var overlap = await dbContext.Schedules
            .Where(s => s.UserId == userId && (excludeId == null || s.ScheduleId != excludeId))
            .AnyAsync(s => s.StartTime < end && start < s.EndTime, cancellationToken);

        if (overlap)
        {
            throw new ConflictException("Schedule overlaps with an existing entry.");
        }
    }
}

