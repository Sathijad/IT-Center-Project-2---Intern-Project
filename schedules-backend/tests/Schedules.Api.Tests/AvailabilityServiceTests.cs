using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Contracts.Availability;
using Schedules.Domain.Entities;
using Schedules.Services;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Schedules.Api.Tests;

public class AvailabilityServiceTests
{
    [Fact]
    public async Task GetAsync_ReturnsLocalBusyOnlyWhenGraphDisabled()
    {
        await using var context = TestUtilities.CreateContext();
        var now = DateTimeOffset.UtcNow;
        context.Schedules.Add(new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = 1,
            Title = "Existing",
            StartTime = now.AddHours(1),
            EndTime = now.AddHours(2),
            CreatedBy = 1,
            UpdatedAt = now,
            CreatedAt = now,
            Status = Domain.Enums.ScheduleStatus.Confirmed,
            Source = Domain.Enums.ScheduleSource.Internal
        });
        await context.SaveChangesAsync(CancellationToken.None);

        var flags = Options.Create(TestUtilities.CreateFlags(enableGraph: false));
        var graphClient = new TestUtilities.FakeGraphClient();
        var userDirectory = new TestUtilities.FakeUserDirectory("user@example.com");
        var service = new AvailabilityService(context, userDirectory, graphClient, flags);

        var response = await service.GetAsync(1, now, now.AddDays(1), CancellationToken.None);

        Assert.Single(response.BusySlots);
        Assert.Equal("LOCAL", response.BusySlots.First().Source);
    }

    [Fact]
    public async Task GetAsync_IncludesGraphSlotsWhenEnabled()
    {
        await using var context = TestUtilities.CreateContext();
        var now = DateTimeOffset.UtcNow;
        var local = new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = 2,
            Title = "Local",
            StartTime = now,
            EndTime = now.AddHours(1),
            CreatedBy = 2,
            CreatedAt = now,
            UpdatedAt = now,
            Status = Domain.Enums.ScheduleStatus.Confirmed,
            Source = Domain.Enums.ScheduleSource.Internal
        };
        context.Schedules.Add(local);

        var graphSlot = new Contracts.Availability.AvailabilitySlot(now.AddHours(2), now.AddHours(3), "GRAPH");
        var fakeClient = new TestUtilities.FakeGraphClient
        {
            AvailabilityResponse = new[] { graphSlot }
        };
        var flags = Options.Create(TestUtilities.CreateFlags(enableGraph: true));
        var userDirectory = new TestUtilities.FakeUserDirectory("user@example.com");
        await context.SaveChangesAsync(CancellationToken.None);

        var service = new AvailabilityService(context, userDirectory, fakeClient, flags);
        var response = await service.GetAsync(2, now.AddHours(-1), now.AddHours(4), CancellationToken.None);

        Assert.Equal(2, response.BusySlots.Count);
        Assert.Contains(response.BusySlots, slot => slot.Source == "GRAPH");
    }
}

