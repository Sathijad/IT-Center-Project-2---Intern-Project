using AutoMapper;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Schedules.Api.Contracts.Schedules;
using Schedules.Api.Data;
using Schedules.Api.Mapping;
using Schedules.Api.Services;
using ScheduleSource = Schedules.Api.Domain.Enums.ScheduleSource;
using Xunit;

namespace Schedules.Tests.Services;

public class ScheduleServiceTests
{
    private static (AppDbContext Db, IScheduleService Service) BuildSut()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);
        var mapperConfig = new MapperConfiguration(cfg => cfg.AddProfile<ScheduleProfile>());
        var mapper = mapperConfig.CreateMapper();
        var service = new ScheduleService(db, mapper, NullLogger<ScheduleService>.Instance);
        return (db, service);
    }

    [Fact]
    public async Task CreateAsync_PersistsSchedule()
    {
        var (db, service) = BuildSut();
        var request = new CreateScheduleRequest(10, null, DateTime.UtcNow, DateTime.UtcNow.AddHours(4), ScheduleSource.Manual, null, null);

        var result = await service.CreateAsync(request, 999, CancellationToken.None);

        result.UserId.Should().Be(10);
        (await db.Schedules.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_ThrowsOnOverlap()
    {
        var (db, service) = BuildSut();
        var start = DateTime.UtcNow;
        db.Schedules.Add(new Schedules.Api.Domain.Entities.Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = 42,
            StartTime = start,
            EndTime = start.AddHours(8),
            CreatedBy = 1,
            CreatedAt = start,
            UpdatedAt = start
        });
        await db.SaveChangesAsync();

        var request = new CreateScheduleRequest(42, null, start.AddHours(1), start.AddHours(2), ScheduleSource.Manual, null, null);

        var act = () => service.CreateAsync(request, 2, CancellationToken.None);

        await act.Should().ThrowAsync<Schedules.Api.Infrastructure.Exceptions.ConflictException>();
    }
}

