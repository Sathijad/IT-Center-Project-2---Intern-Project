using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Training;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class TrainingAssignmentServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly TrainingAssignmentService _service;

    public TrainingAssignmentServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new TrainingAssignmentService(_dbContext);
    }

    [Fact]
    public async Task AssignAsync_ShouldCreateAssignment_WhenUserType()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Test Course");
        _dbContext.TrainingCourses.Add(course);
        await _dbContext.SaveChangesAsync();

        var request = new AssignTrainingRequest(
            CourseId: course.CourseId,
            AssigneeType: TrainingAssigneeType.User,
            AssigneeId: 100,
            CohortId: null,
            DueDate: DateTimeOffset.UtcNow.AddDays(30));

        // Act
        var result = await _service.AssignAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        var assignment = result.First();
        assignment.CourseId.Should().Be(course.CourseId);
        assignment.AssigneeType.Should().Be(TrainingAssigneeType.User);
        assignment.AssigneeId.Should().Be(100);
        assignment.Status.Should().Be(TrainingAssignmentStatus.Assigned);
        assignment.Progress.Should().Be(0);
        assignment.AssignedBy.Should().Be(1);

        var assignmentInDb = await _dbContext.TrainingAssignments.FirstOrDefaultAsync();
        assignmentInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task AssignAsync_ShouldCreateAssignment_WhenCohortType()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Cohort Course");
        _dbContext.TrainingCourses.Add(course);
        await _dbContext.SaveChangesAsync();

        var request = new AssignTrainingRequest(
            CourseId: course.CourseId,
            AssigneeType: TrainingAssigneeType.Cohort,
            AssigneeId: null,
            CohortId: "COHORT_001",
            DueDate: DateTimeOffset.UtcNow.AddDays(30));

        // Act
        var result = await _service.AssignAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        var assignment = result.First();
        assignment.AssigneeType.Should().Be(TrainingAssigneeType.Cohort);
        assignment.CohortId.Should().Be("COHORT_001");
    }

    [Fact]
    public async Task AssignAsync_ShouldThrowNotFoundException_WhenCourseNotExists()
    {
        // Arrange
        var request = new AssignTrainingRequest(
            CourseId: Guid.NewGuid(),
            AssigneeType: TrainingAssigneeType.User,
            AssigneeId: 100,
            CohortId: null,
            DueDate: DateTimeOffset.UtcNow.AddDays(30));

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.AssignAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task AssignAsync_ShouldThrowValidationException_WhenUserTypeWithoutAssigneeId()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Test Course");
        _dbContext.TrainingCourses.Add(course);
        await _dbContext.SaveChangesAsync();

        var request = new AssignTrainingRequest(
            CourseId: course.CourseId,
            AssigneeType: TrainingAssigneeType.User,
            AssigneeId: null,
            CohortId: null,
            DueDate: DateTimeOffset.UtcNow.AddDays(30));

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _service.AssignAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task AssignAsync_ShouldThrowValidationException_WhenCohortTypeWithoutCohortId()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Test Course");
        _dbContext.TrainingCourses.Add(course);
        await _dbContext.SaveChangesAsync();

        var request = new AssignTrainingRequest(
            CourseId: course.CourseId,
            AssigneeType: TrainingAssigneeType.Cohort,
            AssigneeId: null,
            CohortId: null,
            DueDate: DateTimeOffset.UtcNow.AddDays(30));

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _service.AssignAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateAssignment_WhenValidRequest()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Update Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.Assigned,
            progress: 0);
        _dbContext.TrainingAssignments.Add(assignment);
        await _dbContext.SaveChangesAsync();

        var request = new UpdateAssignmentRequest(
            Status: TrainingAssignmentStatus.InProgress,
            Progress: 50,
            CompletedAt: null);

        // Act
        var result = await _service.UpdateAsync(assignment.AssignmentId, request, CancellationToken.None);

        // Assert
        result.Status.Should().Be(TrainingAssignmentStatus.InProgress);
        result.Progress.Should().Be(50);
        
        var updatedAssignment = await _dbContext.TrainingAssignments.FindAsync(assignment.AssignmentId);
        updatedAssignment!.Status.Should().Be(TrainingAssignmentStatus.InProgress);
        updatedAssignment.Progress.Should().Be(50);
    }

    [Fact]
    public async Task UpdateAsync_ShouldAutoSetStatusToCompleted_WhenCompletedAtProvided()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Complete Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100,
            status: TrainingAssignmentStatus.InProgress);
        _dbContext.TrainingAssignments.Add(assignment);
        await _dbContext.SaveChangesAsync();

        var completedAt = DateTimeOffset.UtcNow;
        var request = new UpdateAssignmentRequest(
            Status: null,
            Progress: null,
            CompletedAt: completedAt);

        // Act
        var result = await _service.UpdateAsync(assignment.AssignmentId, request, CancellationToken.None);

        // Assert
        result.Status.Should().Be(TrainingAssignmentStatus.Completed);
        result.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public async Task UpdateAsync_ShouldClampProgress_WhenOutOfRange()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "Progress Course");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment = TestDataBuilder.CreateTrainingAssignment(
            courseId: course.CourseId,
            assigneeId: 100);
        _dbContext.TrainingAssignments.Add(assignment);
        await _dbContext.SaveChangesAsync();

        var request = new UpdateAssignmentRequest(
            Status: null,
            Progress: 150, // Over 100
            CompletedAt: null);

        // Act
        var result = await _service.UpdateAsync(assignment.AssignmentId, request, CancellationToken.None);

        // Assert
        result.Progress.Should().Be(100); // Clamped to 100
    }

    [Fact]
    public async Task GetByUserAsync_ShouldReturnAssignmentsForUser()
    {
        // Arrange
        var course = TestDataBuilder.CreateTrainingCourse(title: "User Assignments");
        _dbContext.TrainingCourses.Add(course);
        
        var assignment1 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 100);
        var assignment2 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 100);
        var assignment3 = TestDataBuilder.CreateTrainingAssignment(courseId: course.CourseId, assigneeId: 200);
        _dbContext.TrainingAssignments.AddRange(assignment1, assignment2, assignment3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByUserAsync(100, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(a => a.AssigneeId == 100);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrowNotFoundException_WhenAssignmentNotExists()
    {
        // Arrange
        var request = new UpdateAssignmentRequest(
            Status: TrainingAssignmentStatus.Completed,
            Progress: null,
            CompletedAt: null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.UpdateAsync(Guid.NewGuid(), request, CancellationToken.None));
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

