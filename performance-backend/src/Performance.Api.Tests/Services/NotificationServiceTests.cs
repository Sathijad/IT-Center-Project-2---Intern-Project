using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Training;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class NotificationServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly NotificationService _service;

    public NotificationServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new NotificationService(_dbContext);
    }

    [Fact]
    public async Task QueueNotificationsAsync_ShouldReturnCount_WhenAssignmentIdsProvided()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Notification Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment1 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 100);
        var assignment2 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 200);
        _dbContext.TrainingAssignments.AddRange(assignment1, assignment2);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: new[] { assignment1.AssignmentId, assignment2.AssignmentId },
            UserId: null,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        var result = await _service.QueueNotificationsAsync(request, CancellationToken.None);

        // Assert
        result.Should().Be(2);
    }

    [Fact]
    public async Task QueueNotificationsAsync_ShouldFilterByUserId_WhenNoAssignmentIds()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "User Filter Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment1 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 100);
        var assignment2 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 200);
        var assignment3 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 100);
        _dbContext.TrainingAssignments.AddRange(assignment1, assignment2, assignment3);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        var result = await _service.QueueNotificationsAsync(request, CancellationToken.None);

        // Assert
        result.Should().Be(2);
    }

    [Fact]
    public async Task QueueNotificationsAsync_ShouldFilterByOverdueOnly()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Overdue Course");
        _dbContext.TrainingCourses.Add(course);
        
        var overdueAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned);
        overdueAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(-5); // Overdue
        
        var futureAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned);
        futureAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(5); // Not overdue
        
        var completedAssignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Completed);
        completedAssignment.DueDate = DateTimeOffset.UtcNow.AddDays(-5); // Overdue but completed
        
        _dbContext.TrainingAssignments.AddRange(overdueAssignment, futureAssignment, completedAssignment);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: true,
            IncompleteOnly: null);

        // Act
        var result = await _service.QueueNotificationsAsync(request, CancellationToken.None);

        // Assert
        result.Should().Be(1); // Only the overdue, incomplete assignment
    }

    [Fact]
    public async Task QueueNotificationsAsync_ShouldFilterByIncompleteOnly()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Incomplete Course");
        _dbContext.TrainingCourses.Add(course);
        
        var incomplete1 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned);
        var incomplete2 = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.InProgress);
        var completed = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Completed);
        
        _dbContext.TrainingAssignments.AddRange(incomplete1, incomplete2, completed);
        await _dbContext.SaveChangesAsync();

        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 100,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: true);

        // Act
        var result = await _service.QueueNotificationsAsync(request, CancellationToken.None);

        // Assert
        result.Should().Be(2); // Only incomplete assignments
    }

    [Fact]
    public async Task QueueNotificationsAsync_ShouldReturnZero_WhenNoMatches()
    {
        // Arrange
        var request = new NotifyStaffRequest(
            AssignmentIds: null,
            UserId: 999,
            TeamId: null,
            OverdueOnly: null,
            IncompleteOnly: null);

        // Act
        var result = await _service.QueueNotificationsAsync(request, CancellationToken.None);

        // Assert
        result.Should().Be(0);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

