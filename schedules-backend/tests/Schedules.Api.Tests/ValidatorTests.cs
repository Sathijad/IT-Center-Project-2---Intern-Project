using Schedules.Contracts.Schedules;
using Schedules.Contracts.Tasks;
using Schedules.Validators;
using System;
using Schedules.Domain.Enums;
using Xunit;

namespace Schedules.Api.Tests;

public class ValidatorTests
{
    [Fact]
    public void ScheduleQueryValidator_FailsWhenOnlyOneRangeBound()
    {
        var validator = new ScheduleQueryValidator();
        var result = validator.Validate(new ScheduleQuery(
            UserId: null,
            TeamId: null,
            RangeStart: DateTimeOffset.UtcNow,
            RangeEnd: null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreateScheduleRequestValidator_FailsWhenRecurrenceMissing()
    {
        var validator = new CreateScheduleRequestValidator();
        var result = validator.Validate(new CreateScheduleRequest(
            UserId: 1,
            TeamId: null,
            Title: "Plan",
            Description: null,
            StartTime: DateTimeOffset.UtcNow,
            EndTime: DateTimeOffset.UtcNow.AddHours(1),
            IsAllDay: false,
            CreateRecurrence: true,
            Recurrence: null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void UpdateScheduleRequestValidator_FailsWhenNoFields()
    {
        var validator = new UpdateScheduleRequestValidator();
        var result = validator.Validate(new UpdateScheduleRequest(
            Title: null,
            Description: null,
            StartTime: null,
            EndTime: null,
            IsAllDay: null,
            Recurrence: null,
            Cancel: null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreateTaskRequestValidator_FailsWhenTooManyTags()
    {
        var validator = new CreateTaskRequestValidator();
        var tags = new string[11];
        var result = validator.Validate(new CreateTaskRequest(
            Title: "Task",
            Description: null,
            AssigneeId: 1,
            ScheduleId: null,
            Priority: TaskPriority.Low,
            DueDate: null,
            Tags: tags));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void UpdateTaskRequestValidator_FailsWhenNoChanges()
    {
        var validator = new UpdateTaskRequestValidator();
        var result = validator.Validate(new UpdateTaskRequest(
            Title: null,
            Description: null,
            Priority: null,
            Status: null,
            DueDate: null,
            Tags: null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreateTaskNoteRequestValidator_FailsWhenBodyEmpty()
    {
        var validator = new CreateTaskNoteRequestValidator();
        var result = validator.Validate(new CreateTaskNoteRequest(string.Empty));
        Assert.False(result.IsValid);
    }
}

