using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Schedules.Configuration;
using Schedules.Contracts.Availability;
using Schedules.Domain.Entities;
using Schedules.Infrastructure.Data;
using Schedules.Integrations;

namespace Schedules.Api.Tests;

internal static class TestUtilities
{
    public static SchedulesDbContext CreateContext(string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<SchedulesDbContext>()
            .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString())
            .Options;
        var context = new SchedulesDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    public static FeatureFlagOptions CreateFlags(
        bool enableGraph = false,
        bool enableNotifications = false,
        bool enableBulkImport = false) =>
        new()
        {
            EnableMsGraphSync = enableGraph,
            EnableTaskNotifications = enableNotifications,
            EnableBulkImport = enableBulkImport
        };

    public sealed class FakeGraphClient : IMsGraphClient
    {
        public IReadOnlyCollection<AvailabilitySlot> AvailabilityResponse { get; set; } = Array.Empty<AvailabilitySlot>();
        public string? EventIdToReturn { get; set; } = "event-123";
        public List<Guid> NotificationRecipients { get; } = new();
        public readonly List<Schedule> UpsertedSchedules = new();

        public Task<IReadOnlyCollection<Contracts.Availability.AvailabilitySlot>> GetAvailabilityAsync(string userPrincipalName, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken)
        {
            return Task.FromResult(AvailabilityResponse);
        }

        public Task<string?> UpsertScheduleAsync(Schedule schedule, CancellationToken cancellationToken)
        {
            UpsertedSchedules.Add(schedule);
            return Task.FromResult(EventIdToReturn);
        }

        public Task SendTaskNotificationAsync(TaskItem task, CancellationToken cancellationToken)
        {
            NotificationRecipients.Add(task.TaskItemId);
            return Task.CompletedTask;
        }
    }

    public sealed class FakeUserDirectory : IUserDirectory
    {
        private readonly string _upn;
        public FakeUserDirectory(string upn) => _upn = upn;
        public Task<string> GetUserPrincipalNameAsync(long userId, CancellationToken cancellationToken) =>
            Task.FromResult(_upn);
    }

    public sealed class RecordingBackgroundJobClient : IBackgroundJobClient
    {
        public List<LambdaExpression> EnqueuedExpressions { get; } = new();

        public List<Job> CreatedJobs { get; } = new();

        public string Create(Job job)
        {
            CreatedJobs.Add(job);
            return Guid.NewGuid().ToString();
        }

        public string Create(Job job, IState state)
        {
            CreatedJobs.Add(job);
            return Guid.NewGuid().ToString();
        }
        public void Delete(string jobId) => throw new NotSupportedException();

        public string Enqueue(Expression<Action> methodCall)
        {
            EnqueuedExpressions.Add(methodCall);
            return Guid.NewGuid().ToString();
        }

        public string Enqueue<T>(Expression<Action<T>> methodCall)
        {
            EnqueuedExpressions.Add(methodCall);
            return Guid.NewGuid().ToString();
        }

        public string Schedule(Expression<Action> methodCall, TimeSpan delay) => throw new NotSupportedException();
        public string Schedule<T>(Expression<Action<T>> methodCall, TimeSpan delay) => throw new NotSupportedException();
        public bool ChangeState(string jobId, IState state, string expectedState) => throw new NotSupportedException();
    }

    public sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public TestWebHostEnvironment(string contentRootPath)
        {
            ContentRootPath = contentRootPath;
            ContentRootFileProvider = new NullFileProvider();
            WebRootFileProvider = new NullFileProvider();
        }

        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Schedules.Api.Tests";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; }
    }
}

