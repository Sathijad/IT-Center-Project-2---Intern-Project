using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using Schedules.Api.Contracts;
using Schedules.Api.Contracts.Schedules;
using Schedules.Api.Data;
using Schedules.Api.Domain.Entities;
using Schedules.Api.Domain.Enums;
using Schedules.Api.Infrastructure.Exceptions;

namespace Schedules.Api.Services;

public interface IScheduleService
{
    Task<PagedResponse<ScheduleDto>> GetAsync(long? userId, Guid? teamId, DateTime? rangeStart, DateTime? rangeEnd, int page, int size, CancellationToken token);
    Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, long actorId, CancellationToken token);
    Task<ScheduleDto> UpdateAsync(Guid scheduleId, UpdateScheduleRequest request, CancellationToken token);
    Task DeleteAsync(Guid scheduleId, CancellationToken token);
}

public class ScheduleService(AppDbContext dbContext, IMapper mapper, ILogger<ScheduleService> logger) : IScheduleService
{
    public async Task<PagedResponse<ScheduleDto>> GetAsync(long? userId, Guid? teamId, DateTime? rangeStart, DateTime? rangeEnd, int page, int size, CancellationToken token)
    {
        var query = dbContext.Schedules
            .Include(s => s.Recurrence)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(q => q.UserId == userId.Value);
        }

        if (teamId.HasValue)
        {
            query = query.Where(q => q.TeamId == teamId.Value);
        }

        if (rangeStart.HasValue && rangeEnd.HasValue)
        {
            query = query.Where(q => q.StartTime >= rangeStart && q.EndTime <= rangeEnd);
        }

        query = query.OrderBy(q => q.StartTime);

        var total = await query.CountAsync(token);
        var items = await query.Skip((page - 1) * size).Take(size)
            .ProjectTo<ScheduleDto>(mapper.ConfigurationProvider)
            .ToListAsync(token);

        return new PagedResponse<ScheduleDto>(items, page, size, total);
    }

    public async Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, long actorId, CancellationToken token)
    {
        await EnsureNoOverlapAsync(request.UserId, request.StartTime, request.EndTime, token);

        var entity = new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = request.UserId,
            TeamId = request.TeamId,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Source = request.Source,
            Metadata = request.Metadata,
            CreatedBy = actorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Recurrence = request.Recurrence is null ? null : mapper.Map<Recurrence>(request.Recurrence)
        };

        dbContext.Schedules.Add(entity);
        await dbContext.SaveChangesAsync(token);

        logger.LogInformation("Schedule {ScheduleId} created by {Actor}", entity.ScheduleId, actorId);
        return mapper.Map<ScheduleDto>(entity);
    }

    public async Task<ScheduleDto> UpdateAsync(Guid scheduleId, UpdateScheduleRequest request, CancellationToken token)
    {
        var schedule = await dbContext.Schedules.Include(s => s.Recurrence)
            .FirstOrDefaultAsync(s => s.ScheduleId == scheduleId, token)
            ?? throw new NotFoundException($"Schedule {scheduleId} not found");

        if (request.StartTime.HasValue && request.EndTime.HasValue)
        {
            await EnsureNoOverlapAsync(schedule.UserId, request.StartTime.Value, request.EndTime.Value, token, schedule.ScheduleId);
            schedule.StartTime = request.StartTime.Value;
            schedule.EndTime = request.EndTime.Value;
        }

        if (request.Status.HasValue)
        {
            schedule.Status = request.Status.Value;
        }

        schedule.Metadata = request.Metadata ?? schedule.Metadata;
        schedule.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(token);

        return mapper.Map<ScheduleDto>(schedule);
    }

    public async Task DeleteAsync(Guid scheduleId, CancellationToken token)
    {
        var schedule = await dbContext.Schedules.FirstOrDefaultAsync(s => s.ScheduleId == scheduleId, token)
            ?? throw new NotFoundException($"Schedule {scheduleId} not found");

        dbContext.Schedules.Remove(schedule);
        await dbContext.SaveChangesAsync(token);
    }

    private async Task EnsureNoOverlapAsync(long userId, DateTime start, DateTime end, CancellationToken token, Guid? excludeId = null)
    {
        var overlaps = await dbContext.Schedules
            .Where(s => s.UserId == userId && s.Status == ScheduleStatus.Active)
            .Where(s => s.StartTime < end && start < s.EndTime)
            .Where(s => excludeId == null || s.ScheduleId != excludeId)
            .AnyAsync(token);

        if (overlaps)
        {
            throw new ConflictException("Schedule overlaps with an existing entry.");
        }
    }
}

