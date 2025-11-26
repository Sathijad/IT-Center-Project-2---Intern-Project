using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts.Schedules;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using Schedules.Errors;
using Schedules.Infrastructure.Data;
using Schedules.Mapping;
using Schedules.Services;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Schedules.Api.Tests;

public class ScheduleServiceTests
{
    private static IMapper CreateMapper() =>
        new Mapper(new MapperConfiguration(cfg => cfg.AddProfile<ScheduleProfile>()));

    private static SchedulesDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<SchedulesDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        var context = new SchedulesDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private static Schedule BuildSchedule(long userId, DateTimeOffset start, DateTimeOffset end) =>
        new()
        {
            ScheduleId = Guid.NewGuid(),
            UserId = userId,
            TeamId = 7,
            Title = "Existing Shift",
            StartTime = start,
            EndTime = end,
            Status = ScheduleStatus.Confirmed,
            Source = ScheduleSource.Internal,
            CreatedBy = userId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task CreateAsync_WithRecurrence_PersistsScheduleAndRecurrence()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var service = new ScheduleService(context, mapper);

        var now = DateTimeOffset.UtcNow;
        var request = new CreateScheduleRequest(
            UserId: 42,
            TeamId: 11,
            Title: "Planning",
            Description: "Weekly sync",
            StartTime: now,
            EndTime: now.AddHours(1),
            IsAllDay: false,
            CreateRecurrence: true,
            Recurrence: new RecurrencePayload("WEEKLY", 1, "MO", null, null));

        var response = await service.CreateAsync(request, actorId: 42, CancellationToken.None);

        Assert.Equal(request.Title, response.Title);
        Assert.NotNull(response.Recurrence);
        Assert.Equal("WEEKLY", response.Recurrence?.Pattern);
        Assert.Single(context.Schedules);
        Assert.Single(context.Recurrences);
    }

    [Fact]
    public async Task CreateAsync_WhenScheduleOverlaps_ThrowsConflict()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var existing = BuildSchedule(42, DateTimeOffset.UtcNow.AddHours(9), DateTimeOffset.UtcNow.AddHours(10));
        context.Schedules.Add(existing);
        await context.SaveChangesAsync();

        var service = new ScheduleService(context, mapper);
        var request = new CreateScheduleRequest(
            UserId: 42,
            TeamId: 11,
            Title: "Conflicting",
            Description: null,
            StartTime: existing.StartTime.AddMinutes(15),
            EndTime: existing.EndTime.AddMinutes(15),
            IsAllDay: false,
            CreateRecurrence: false,
            Recurrence: null);

        await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(request, actorId: 42, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_WhenNewWindowOverlapsAnotherSchedule_ThrowsConflict()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var scheduleA = BuildSchedule(42, DateTimeOffset.UtcNow.AddHours(8), DateTimeOffset.UtcNow.AddHours(9));
        var scheduleB = BuildSchedule(42, DateTimeOffset.UtcNow.AddHours(10), DateTimeOffset.UtcNow.AddHours(11));
        context.Schedules.AddRange(scheduleA, scheduleB);
        await context.SaveChangesAsync();

        var service = new ScheduleService(context, mapper);

        var request = new UpdateScheduleRequest(
            Title: null,
            Description: null,
            StartTime: scheduleA.StartTime.AddMinutes(30),
            EndTime: scheduleB.EndTime,
            IsAllDay: null,
            Recurrence: null,
            Cancel: null);

        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateAsync(scheduleB.ScheduleId, request, CancellationToken.None));
    }

    [Fact]
    public async Task GetAsync_FiltersByUserAndReturnsPagedResult()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var baseTime = DateTimeOffset.UtcNow;
        context.Schedules.AddRange(
            BuildSchedule(1, baseTime.AddHours(1), baseTime.AddHours(2)),
            BuildSchedule(1, baseTime.AddHours(3), baseTime.AddHours(4)),
            BuildSchedule(2, baseTime.AddHours(5), baseTime.AddHours(6)));
        await context.SaveChangesAsync();

        var service = new ScheduleService(context, mapper);
        var result = await service.GetAsync(
            new ScheduleQuery(1, null, null, null, Page: 1, Size: 10),
            CancellationToken.None);

        var items = result.Items.ToList();

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, items.Count);
        Assert.All(items, item => Assert.Equal(1, item.UserId));
        var orderedStartTimes = items.Select(i => i.StartTime).OrderBy(t => t).ToList();
        Assert.Equal(orderedStartTimes, items.Select(i => i.StartTime).ToList());
    }
}

