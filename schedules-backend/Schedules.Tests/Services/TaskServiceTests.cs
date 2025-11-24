using AutoMapper;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Schedules.Api.Contracts.Tasks;
using Schedules.Api.Data;
using Schedules.Api.Mapping;
using Schedules.Api.Options;
using Schedules.Api.Services;
using Schedules.Api.Integrations;
using TaskPriority = Schedules.Api.Domain.Enums.TaskPriority;
using Xunit;

namespace Schedules.Tests.Services;

public class TaskServiceTests
{
    private static TaskService BuildService(AppDbContext dbContext, FeatureFlagOptions flags, Mock<ITeamsNotifier> notifierMock)
    {
        var mapperConfig = new MapperConfiguration(cfg => cfg.AddProfile<TaskProfile>());
        var mapper = mapperConfig.CreateMapper();
        var monitor = Mock.Of<IOptionsMonitor<FeatureFlagOptions>>(m => m.CurrentValue == flags);
        var flagServiceMock = new Mock<IFeatureFlagService>();
        flagServiceMock.Setup(f => f.IsTaskNotificationEnabled()).Returns(flags.EnableTaskNotifications);
        flagServiceMock.Setup(f => f.IsMobileTaskCommentsEnabled()).Returns(flags.EnableMobileTaskComments);

        return new TaskService(
            dbContext,
            mapper,
            NullLogger<TaskService>.Instance,
            monitor,
            flagServiceMock.Object,
            notifierMock.Object);
    }

    private static AppDbContext BuildDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_NotifiesWhenFlagEnabled()
    {
        await using var db = BuildDb();
        var notifier = new Mock<ITeamsNotifier>();
        var service = BuildService(db, new FeatureFlagOptions { EnableTaskNotifications = true, EnableMobileTaskComments = true }, notifier);

        var response = await service.CreateAsync(new CreateTaskRequest("Task A", null, TaskPriority.Medium, null, 99, null, null), 7, CancellationToken.None);

        response.AssigneeId.Should().Be(99);
        notifier.Verify(n => n.SendTaskAssignedAsync(response.TaskId, 99, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AddCommentAsync_ThrowsWhenCommentsDisabled()
    {
        await using var db = BuildDb();
        db.Tasks.Add(new Schedules.Api.Domain.Entities.TaskEntity
        {
            TaskId = Guid.NewGuid(),
            Title = "X",
            AssigneeId = 1,
            ReporterId = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var notifier = new Mock<ITeamsNotifier>();
        var service = BuildService(db, new FeatureFlagOptions { EnableMobileTaskComments = false }, notifier);

        var act = () => service.AddCommentAsync(db.Tasks.First().TaskId, new CreateTaskCommentRequest("Hello", null), 2, CancellationToken.None);

        await act.Should().ThrowAsync<Schedules.Api.Infrastructure.Exceptions.ApiException>()
            .WithMessage("*disabled*");
    }
}

