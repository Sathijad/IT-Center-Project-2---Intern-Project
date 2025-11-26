using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using TaskStatusEnum = Schedules.Domain.Enums.TaskStatus;
using Schedules.Workers;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Schedules.Api.Tests;

public class WorkerTests
{
    [Fact]
    public async Task CalendarSyncWorker_SkipsWhenGraphSyncDisabled()
    {
        await using var context = TestUtilities.CreateContext();
        var flags = Options.Create(TestUtilities.CreateFlags(enableGraph: false));
        var graphClient = new TestUtilities.FakeGraphClient();
        var worker = new CalendarSyncWorker(context, graphClient, flags, NullLogger<CalendarSyncWorker>.Instance);

        await worker.PushAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.Empty(graphClient.UpsertedSchedules);
    }

    [Fact]
    public async Task CalendarSyncWorker_UpdatesScheduleWhenEnabled()
    {
        await using var context = TestUtilities.CreateContext();
        var schedule = new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = 3,
            Title = "Sync",
            StartTime = DateTimeOffset.UtcNow,
            EndTime = DateTimeOffset.UtcNow.AddHours(1),
            Source = ScheduleSource.Internal,
            Status = ScheduleStatus.Confirmed,
            CreatedBy = 3,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Schedules.Add(schedule);
        await context.SaveChangesAsync(CancellationToken.None);

        var flags = Options.Create(TestUtilities.CreateFlags(enableGraph: true));
        var graphClient = new TestUtilities.FakeGraphClient { EventIdToReturn = "evt-1" };
        var worker = new CalendarSyncWorker(context, graphClient, flags, NullLogger<CalendarSyncWorker>.Instance);

        await worker.PushAsync(schedule.ScheduleId, CancellationToken.None);

        var refreshed = await context.Schedules.FindAsync(schedule.ScheduleId);
        Assert.Equal("evt-1", refreshed!.CalendarEventId);
        Assert.Single(graphClient.UpsertedSchedules);
    }

    [Fact]
    public async Task DailyReminderWorker_SendsNotificationsWhenEnabled()
    {
        await using var context = TestUtilities.CreateContext();
        var tomorrow = DateTimeOffset.UtcNow.Date.AddDays(1);
        context.Tasks.AddRange(
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "Due 1",
                AssigneeId = 1,
                DueDate = tomorrow.AddHours(9),
                Priority = TaskPriority.Medium,
                Status = TaskStatusEnum.Pending,
                CreatedBy = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "Due 2",
                AssigneeId = 1,
                DueDate = tomorrow.AddHours(12),
                Priority = TaskPriority.High,
                Status = TaskStatusEnum.Pending,
                CreatedBy = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new TaskItem
            {
                TaskItemId = Guid.NewGuid(),
                Title = "Future",
                AssigneeId = 1,
                DueDate = tomorrow.AddDays(1),
                Priority = TaskPriority.Low,
                Status = TaskStatusEnum.Pending,
                CreatedBy = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        await context.SaveChangesAsync(CancellationToken.None);

        var flags = Options.Create(TestUtilities.CreateFlags(enableNotifications: true));
        var graphClient = new TestUtilities.FakeGraphClient();
        var worker = new DailyReminderWorker(context, graphClient, flags, NullLogger<DailyReminderWorker>.Instance);

        await worker.SendRemindersAsync(CancellationToken.None);

        Assert.Equal(2, graphClient.NotificationRecipients.Count);
    }

    [Fact]
    public async Task TaskNotificationWorker_SkipsWhenDisabled()
    {
        await using var context = TestUtilities.CreateContext();
        var task = new TaskItem
        {
            TaskItemId = Guid.NewGuid(),
            Title = "Notif",
            AssigneeId = 2,
            Priority = TaskPriority.Low,
            Status = TaskStatusEnum.Pending,
            CreatedBy = 2,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Tasks.Add(task);
        await context.SaveChangesAsync(CancellationToken.None);

        var flags = Options.Create(TestUtilities.CreateFlags(enableNotifications: false));
        var graphClient = new TestUtilities.FakeGraphClient();
        var worker = new TaskNotificationWorker(context, graphClient, flags, NullLogger<TaskNotificationWorker>.Instance);

        await worker.NotifyAsync(task.TaskItemId, CancellationToken.None);

        Assert.Empty(graphClient.NotificationRecipients);
    }

    [Fact]
    public async Task TaskNotificationWorker_SendsNotificationWhenEnabled()
    {
        await using var context = TestUtilities.CreateContext();
        var task = new TaskItem
        {
            TaskItemId = Guid.NewGuid(),
            Title = "Notify me",
            AssigneeId = 2,
            Priority = TaskPriority.Low,
            Status = TaskStatusEnum.Pending,
            CreatedBy = 2,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Tasks.Add(task);
        await context.SaveChangesAsync(CancellationToken.None);

        var flags = Options.Create(TestUtilities.CreateFlags(enableNotifications: true));
        var graphClient = new TestUtilities.FakeGraphClient();
        var worker = new TaskNotificationWorker(context, graphClient, flags, NullLogger<TaskNotificationWorker>.Instance);

        await worker.NotifyAsync(task.TaskItemId, CancellationToken.None);

        Assert.Single(graphClient.NotificationRecipients);
        Assert.Contains(task.TaskItemId, graphClient.NotificationRecipients);
    }

    [Fact]
    public async Task ScheduleImportWorker_ProcessesRowsAndRecordsConflicts()
    {
        var jobId = Guid.NewGuid();
        await using var context = TestUtilities.CreateContext();
        var conflictStart = DateTimeOffset.Parse("2025-11-27T03:00:00Z");
        var existing = new Schedule
        {
            ScheduleId = Guid.NewGuid(),
            UserId = 99,
            StartTime = conflictStart,
            EndTime = conflictStart.AddHours(1),
            Title = "Conflict",
            Source = ScheduleSource.Internal,
            Status = ScheduleStatus.Confirmed,
            CreatedBy = 99,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        context.Schedules.Add(existing);

        var tempDir = Path.Combine(Path.GetTempPath(), "schedule-import-" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);
        var csvPath = Path.Combine(tempDir, "import.csv");
        File.WriteAllText(csvPath, "UserId,TeamId,Title,Description,StartTime,EndTime\n" +
            "99,0,Overlap,,2025-11-27T03:00:00Z,2025-11-27T04:30:00Z\n" +
            "100,1,New shift,,2025-11-27T05:00:00Z,2025-11-27T06:00:00Z");

        var job = new ImportJob
        {
            ImportJobId = jobId,
            FilePath = csvPath,
            JobType = ImportJobType.Schedules,
            RequestedBy = 77,
            Status = ImportJobStatus.Queued,
            CreatedAt = DateTimeOffset.UtcNow
        };
        context.ImportJobs.Add(job);
        await context.SaveChangesAsync(CancellationToken.None);

        var worker = new ScheduleImportWorker(context, NullLogger<ScheduleImportWorker>.Instance);
        await worker.ProcessAsync(jobId, CancellationToken.None);

        var updatedJob = await context.ImportJobs.FindAsync(jobId);
        Assert.Equal(ImportJobStatus.Succeeded, updatedJob!.Status);
        Assert.Equal(1, updatedJob.ProcessedCount);
        Assert.Equal(1, updatedJob.FailedCount);
        Assert.Equal(2, await context.Schedules.CountAsync());

        Directory.Delete(tempDir, recursive: true);
    }
}

