using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Infrastructure.Data;
using Performance.Workers;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Workers;

public class KpiImportWorkerTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly Mock<ILogger<KpiImportWorker>> _loggerMock;
    private readonly KpiImportWorker _worker;

    public KpiImportWorkerTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _loggerMock = new Mock<ILogger<KpiImportWorker>>();
        _worker = new KpiImportWorker(_dbContext, _loggerMock.Object);
    }

    [Fact]
    public async Task ProcessAsync_ShouldProcessValidCsv_AndCreateActuals()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: CreateTestCsvFile("TEST_KPI,100,2025-01-15T10:00:00Z,95.5"),
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var updatedJob = await _dbContext.ImportJobs.FindAsync(job.ImportJobId);
        updatedJob.Should().NotBeNull();
        updatedJob!.Status.Should().Be(ImportJobStatus.Succeeded);
        updatedJob.ProcessedCount.Should().Be(1);
        updatedJob.FailedCount.Should().Be(0);

        var actuals = await _dbContext.KpiActuals.ToListAsync();
        actuals.Should().HaveCount(1);
        actuals.First().Value.Should().Be(95.5m);
    }

    [Fact]
    public async Task ProcessAsync_ShouldAutoCreateKpi_WhenKpiNotExists()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: CreateTestCsvFile("NEW_KPI,100,2025-01-15T10:00:00Z,50"),
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var kpi = await _dbContext.Kpis.FirstOrDefaultAsync(k => k.Code == "NEW_KPI");
        kpi.Should().NotBeNull();
        kpi!.IsActive.Should().BeTrue();
        
        var actuals = await _dbContext.KpiActuals.ToListAsync();
        actuals.Should().HaveCount(1);
    }

    [Fact]
    public async Task ProcessAsync_ShouldHandleInvalidDate_AndIncrementFailedCount()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: CreateTestCsvFile("TEST_KPI,100,invalid-date,50"),
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var updatedJob = await _dbContext.ImportJobs.FindAsync(job.ImportJobId);
        updatedJob!.FailedCount.Should().Be(1);
        updatedJob.ProcessedCount.Should().Be(0);
    }

    [Fact]
    public async Task ProcessAsync_ShouldHandleInvalidValue_AndIncrementFailedCount()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: CreateTestCsvFile("TEST_KPI,100,2025-01-15T10:00:00Z,invalid-value"),
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var updatedJob = await _dbContext.ImportJobs.FindAsync(job.ImportJobId);
        updatedJob!.FailedCount.Should().Be(1);
        updatedJob.ProcessedCount.Should().Be(0);
    }

    [Fact]
    public async Task ProcessAsync_ShouldProcessMultipleRows()
    {
        // Arrange
        var csvContent = @"kpi_code,user_id,measured_at,value
TEST_KPI,100,2025-01-15T10:00:00Z,50
TEST_KPI,200,2025-01-15T10:00:00Z,60
TEST_KPI,100,2025-01-16T10:00:00Z,55";

        var job = TestDataBuilder.CreateImportJob(
            filePath: CreateTestCsvFile(csvContent),
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var updatedJob = await _dbContext.ImportJobs.FindAsync(job.ImportJobId);
        updatedJob!.ProcessedCount.Should().Be(3);
        
        var actuals = await _dbContext.KpiActuals.ToListAsync();
        actuals.Should().HaveCount(3);
    }

    [Fact]
    public async Task ProcessAsync_ShouldSetJobStatusToFailed_WhenExceptionOccurs()
    {
        // Arrange
        var job = TestDataBuilder.CreateImportJob(
            filePath: "/nonexistent/file.csv",
            requestedBy: 1,
            status: ImportJobStatus.Queued);
        _dbContext.ImportJobs.Add(job);
        await _dbContext.SaveChangesAsync();

        // Act
        await _worker.ProcessAsync(job.ImportJobId, CancellationToken.None);

        // Assert
        var updatedJob = await _dbContext.ImportJobs.FindAsync(job.ImportJobId);
        updatedJob!.Status.Should().Be(ImportJobStatus.Failed);
        updatedJob.ErrorDetails.Should().NotBeNull();
    }

    [Fact]
    public async Task ProcessAsync_ShouldNotProcess_WhenJobNotFound()
    {
        // Arrange
        var nonExistentJobId = Guid.NewGuid();

        // Act
        await _worker.ProcessAsync(nonExistentJobId, CancellationToken.None);

        // Assert
        // Should not throw, just log warning
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("not found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    private string CreateTestCsvFile(string content)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "performance-imports");
        Directory.CreateDirectory(tempDir);
        var filePath = Path.Combine(tempDir, $"{Guid.NewGuid()}.csv");
        
        // Add header if not present
        if (!content.StartsWith("kpi_code", StringComparison.OrdinalIgnoreCase))
        {
            content = "kpi_code,user_id,measured_at,value\n" + content;
        }
        
        File.WriteAllText(filePath, content);
        return filePath;
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        
        // Clean up test files
        var tempDir = Path.Combine(Path.GetTempPath(), "performance-imports");
        if (Directory.Exists(tempDir))
        {
            try
            {
                Directory.Delete(tempDir, true);
            }
            catch
            {
                // Ignore cleanup errors
            }
        }
    }
}

