using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Enums;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class ImportServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly ImportService _service;

    public ImportServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new ImportService(_dbContext);
    }

    [Fact]
    public async Task CreateImportJobAsync_ShouldCreateJob_WhenValidRequest()
    {
        // Arrange
        var filePath = "/tmp/test.csv";
        var requestedBy = 1L;

        // Act
        var jobId = await _service.CreateImportJobAsync(filePath, requestedBy, CancellationToken.None);

        // Assert
        jobId.Should().NotBeEmpty();

        var job = await _dbContext.ImportJobs.FindAsync(jobId);
        job.Should().NotBeNull();
        job!.FilePath.Should().Be(filePath);
        job.RequestedBy.Should().Be(requestedBy);
        job.Status.Should().Be(ImportJobStatus.Queued);
        job.JobType.Should().Be(ImportJobType.KpiActuals);
        job.ProcessedCount.Should().Be(0);
        job.FailedCount.Should().Be(0);
    }

    [Fact]
    public async Task GetImportJobAsync_ShouldReturnJob_WhenExists()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: "/tmp/test.csv",
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetImportJobAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.JobId.Should().Be(job.ImportJobId);
        result.Status.Should().Be(ImportJobStatus.Queued);
        result.JobType.Should().Be(ImportJobType.KpiActuals);
    }

    [Fact]
    public async Task GetImportJobAsync_ShouldThrowNotFoundException_WhenNotExists()
    {
        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.GetImportJobAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task GetImportJobAsync_ShouldReturnJobWithCounts_WhenProcessed()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: "/tmp/test.csv",
            requestedBy: 1,
            status: ImportJobStatus.Succeeded);
        job.ProcessedCount = 10;
        job.FailedCount = 2;
        job.StartedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        job.CompletedAt = DateTimeOffset.UtcNow;
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetImportJobAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        result.ProcessedCount.Should().Be(10);
        result.FailedCount.Should().Be(2);
        result.Status.Should().Be(ImportJobStatus.Succeeded);
        result.StartedAt.Should().NotBeNull();
        result.CompletedAt.Should().NotBeNull();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

