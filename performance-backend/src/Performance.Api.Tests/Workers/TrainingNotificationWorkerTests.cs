using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Performance.Contracts.Training;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Infrastructure.Data;
using Performance.Integrations;
using Performance.Workers;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Workers;

public class TrainingNotificationWorkerTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly Mock<ILogger<TrainingNotificationWorker>> _loggerMock;
    private readonly Mock<IMsGraphClient> _graphClientMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly TrainingNotificationWorker _worker;

    public TrainingNotificationWorkerTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _loggerMock = new Mock<ILogger<TrainingNotificationWorker>>();
        _graphClientMock = new Mock<IMsGraphClient>();
        _emailServiceMock = new Mock<IEmailService>();
        
        _worker = new TrainingNotificationWorker(
            _dbContext,
            _loggerMock.Object,
            _graphClientMock.Object,
            _emailServiceMock.Object);
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldSendNotifications_ForAssignmentIds()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Test Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment1 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100);
        var assignment2 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 200);
        _dbContext.TrainingAssignments.AddRange(assignment1, assignment2);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: new[] { assignment1.AssignmentId, assignment2.AssignmentId },
            UserId: null,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        _emailServiceMock.Verify(
            s => s.SendTrainingReminderAsync(
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<DateTimeOffset?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldFilterByUserId()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Filter Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment1 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100);
        var assignment2 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 200);
        _dbContext.TrainingAssignments.AddRange(assignment1, assignment2);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        _emailServiceMock.Verify(
            s => s.SendTrainingReminderAsync(
                100,
                It.IsAny<string>(),
                It.IsAny<DateTimeOffset?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldFilterByOverdueOnly()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Overdue Course");
        _dbContext.TrainingCourses.Add(course);
        
        var overdueAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned);
        overdueAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(-5);
        
        var futureAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned);
        futureAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(5);
        
        _dbContext.TrainingAssignments.AddRange(overdueAssignment, futureAssignment);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: true,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        _emailServiceMock.Verify(
            s => s.SendTrainingReminderAsync(
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<DateTimeOffset?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Once); // Only overdue assignment
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldNotSend_ForCompletedAssignments()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Completed Course");
        _dbContext.TrainingCourses.Add(course);
        
        var completedAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Completed);
        completedAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(-5);
        
        _dbContext.TrainingAssignments.Add(completedAssignment);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: true,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        _emailServiceMock.Verify(
            s => s.SendTrainingReminderAsync(
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<DateTimeOffset?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldHandleExceptions_Gracefully()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Error Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100);
        _dbContext.TrainingAssignments.Add(assignment);
        await _dbContext.SaveChangesAsync();

        _emailServiceMock
            .Setup(s => s.SendTrainingReminderAsync(
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<DateTimeOffset?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Email service error"));

        var request = new NotifyStaffRequest(
            AssignmentIds: new[] { assignment.AssignmentId },
            UserId: null,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        // Should not throw, just log error
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to send notification")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendNotificationsAsync_ShouldLogTeamsMeetingCreation_WhenUrlProvided()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Teams Course");
        course.TeamsMeetingUrl = "https://teams.microsoft.com/meeting";
        _dbContext.TrainingCourses.Add(course);
        
        var assignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100);
        _dbContext.TrainingAssignments.Add(assignment);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: new[] { assignment.AssignmentId },
            UserId: null,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        await _worker.SendNotificationsAsync(request, CancellationToken.None);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Would create Teams meeting")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

