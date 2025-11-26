using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Schedules.Contracts.Tasks;
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
using TaskStatusEnum = Schedules.Domain.Enums.TaskStatus;
using Xunit;

namespace Schedules.Api.Tests;

public class TaskServiceTests
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

    [Fact]
    public async Task UpdateAsync_UpdatesPropertiesAndMaintainsNotes()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var task = new TaskItem
        {
            TaskItemId = Guid.NewGuid(),
            Title = "Initial Task",
            Description = "Original",
            AssigneeId = 7,
            Priority = TaskPriority.Low,
            Status = TaskStatusEnum.Pending,
            CreatedBy = 7,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, mapper);

        var response = await service.UpdateAsync(
            task.TaskItemId,
            new UpdateTaskRequest(
                Title: "Updated Task",
                Description: "Follow-up",
                Priority: TaskPriority.High,
                Status: TaskStatusEnum.InProgress,
                DueDate: DateTimeOffset.UtcNow.AddDays(1),
                Tags: new[] { "followup" }),
            CancellationToken.None);

        Assert.Equal("Updated Task", response.Title);
        Assert.Equal("Follow-up", response.Description);
        Assert.Equal(TaskPriority.High, response.Priority);
        Assert.Equal(TaskStatusEnum.InProgress, response.Status);
        Assert.Contains("followup", response.Tags);
    }

    [Fact]
    public async Task AddNoteAsync_AppendsNoteAndReturnsPayload()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var task = new TaskItem
        {
            TaskItemId = Guid.NewGuid(),
            Title = "Task With Notes",
            AssigneeId = 5,
            Priority = TaskPriority.Medium,
            Status = TaskStatusEnum.Pending,
            CreatedBy = 5,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
        };

        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, mapper);

        var response = await service.AddNoteAsync(
            task.TaskItemId,
            new CreateTaskNoteRequest("Need clarification"),
            actorId: 99,
            CancellationToken.None);

        Assert.Single(response.Notes);
        Assert.Equal("Need clarification", response.Notes.First().Body);
        Assert.Equal(1, context.TaskNotes.Count());
    }

    [Fact]
    public async Task UpdateAsync_TaskNotFound_ThrowsNotFound()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var service = new TaskService(context, mapper);

        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateAsync(
            Guid.NewGuid(),
            new UpdateTaskRequest(
                Title: null,
                Description: null,
                Priority: null,
                Status: null,
                DueDate: null,
                Tags: null),
            CancellationToken.None));
    }

    [Fact]
    public async Task AddNoteAsync_TaskNotFound_ThrowsNotFound()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        var service = new TaskService(context, mapper);

        await Assert.ThrowsAsync<NotFoundException>(() => service.AddNoteAsync(
            Guid.NewGuid(),
            new CreateTaskNoteRequest("oops"),
            actorId: 1,
            CancellationToken.None));
    }

    [Fact]
    public async Task GetAsync_AppliesAssigneeAndStatusFilters()
    {
        var mapper = CreateMapper();
        await using var context = CreateContext(Guid.NewGuid().ToString());

        context.Tasks.AddRange(
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "Pending Task",
                AssigneeId = 5,
                Status = TaskStatusEnum.Pending,
                Priority = TaskPriority.Low,
                CreatedBy = 5,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "InProgress Task",
                AssigneeId = 5,
                Status = TaskStatusEnum.InProgress,
                Priority = TaskPriority.Medium,
                CreatedBy = 5,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "Other assignee",
                AssigneeId = 6,
                Status = TaskStatusEnum.InProgress,
                Priority = TaskPriority.Medium,
                CreatedBy = 6,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        await context.SaveChangesAsync();

        var service = new TaskService(context, mapper);

        var result = await service.GetAsync(
            new TaskQuery(Assignee: 5, Status: TaskStatusEnum.InProgress.ToString(), Page: 1, Size: 10),
            CancellationToken.None);

        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Items);
        Assert.All(result.Items, item => Assert.Equal(5, item.AssigneeId));
        Assert.All(result.Items, item => Assert.Equal(TaskStatusEnum.InProgress, item.Status));
    }
}

