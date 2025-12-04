using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Performance.Contracts.Performance;
using Performance.Controllers;
using Performance.Domain.Entities;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Controllers;

public class PerformanceControllerTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly Mock<IMetricsService> _metricsServiceMock;
    private readonly Mock<IKpiTargetService> _kpiTargetServiceMock;
    private readonly Mock<IKpiService> _kpiServiceMock;
    private readonly Mock<IKpiActualService> _kpiActualServiceMock;
    private readonly IDbContextFactory<PerformanceDbContext> _dbContextFactory;
    private readonly PerformanceController _controller;

    public PerformanceControllerTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _dbContextFactory = TestDbContextFactory.CreateFactory();
        
        _metricsServiceMock = new Mock<IMetricsService>();
        _kpiTargetServiceMock = new Mock<IKpiTargetService>();
        _kpiServiceMock = new Mock<IKpiService>();
        _kpiActualServiceMock = new Mock<IKpiActualService>();

        _controller = new PerformanceController(
            _metricsServiceMock.Object,
            _kpiTargetServiceMock.Object,
            _kpiServiceMock.Object,
            _kpiActualServiceMock.Object,
            _dbContextFactory);

        ControllerTestHelpers.SetControllerContext(_controller);
    }

    [Fact]
    public async Task GetMetrics_ShouldReturnOk_WhenValidQuery()
    {
        // Arrange
        var expectedResults = new List<MetricsSnapshotResponse>
        {
            new MetricsSnapshotResponse("KPI_1", "Test KPI", 95m, 100m, -5m, "Count", DateTimeOffset.UtcNow)
        };

        _metricsServiceMock
            .Setup(s => s.GetSnapshotAsync(It.IsAny<MetricsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResults);

        // Act
        var result = await _controller.GetMetrics(null, null, null, null, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value.Should().BeAssignableTo<IReadOnlyCollection<MetricsSnapshotResponse>>().Subject;
        value.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMetrics_ShouldParseRange_WhenLast30Days()
    {
        // Arrange
        var expectedResults = new List<MetricsSnapshotResponse>();
        _metricsServiceMock
            .Setup(s => s.GetSnapshotAsync(It.IsAny<MetricsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResults);

        // Act
        await _controller.GetMetrics(null, null, null, "last30days", CancellationToken.None);

        // Assert
        _metricsServiceMock.Verify(s => s.GetSnapshotAsync(
            It.Is<MetricsQuery>(q => q.RangeStart.HasValue && q.RangeEnd.HasValue),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetTimeSeries_ShouldReturnOk_WhenValidQuery()
    {
        // Arrange
        var expectedResults = new List<MetricsTimeSeriesResponse>
        {
            new MetricsTimeSeriesResponse("KPI_1", "Test KPI", "Count", new List<TimeSeriesPoint>())
        };

        _metricsServiceMock
            .Setup(s => s.GetTimeSeriesAsync(It.IsAny<MetricsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResults);

        // Act
        var result = await _controller.GetTimeSeries(null, null, null, null, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value.Should().BeAssignableTo<IReadOnlyCollection<MetricsTimeSeriesResponse>>().Subject;
        value.Should().HaveCount(1);
    }

    [Fact(Skip = "Requires relational database for GetActorIdAsync. Test in integration tests.")]
    public async Task CreateTarget_ShouldReturnCreated_WhenValidRequest()
    {
        // Note: This test requires a relational database provider for GetActorIdAsync
        // which uses GetDbConnection(). In-memory database doesn't support this.
        // This should be tested in integration tests with a real PostgreSQL database.
    }

    [Fact]
    public async Task CreateKpi_ShouldReturnCreated_WhenValidRequest()
    {
        // Arrange
        var request = new CreateKpiRequest(
            Code: "NEW_KPI",
            Name: "New KPI",
            Description: "Description",
            Unit: "Count",
            Category: "Test",
            CalculationHint: null);

        var expectedResponse = new KpiResponse(
            Guid.NewGuid(),
            "NEW_KPI",
            "New KPI",
            "Description",
            "Count",
            "Test",
            null,
            true,
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow);

        _kpiServiceMock
            .Setup(s => s.CreateAsync(It.IsAny<CreateKpiRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.CreateKpi(request, CancellationToken.None);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeOfType<KpiResponse>();
    }

    [Fact]
    public async Task GetKpis_ShouldReturnOk_WhenKpisExist()
    {
        // Arrange
        var expectedKpis = new List<KpiResponse>
        {
            new KpiResponse(Guid.NewGuid(), "KPI_1", "Test KPI", null, null, null, null, true, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow)
        };

        _kpiServiceMock
            .Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedKpis);

        // Act
        var result = await _controller.GetKpis(CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value.Should().BeAssignableTo<IReadOnlyCollection<KpiResponse>>().Subject;
        value.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetKpi_ShouldReturnOk_WhenExists()
    {
        // Arrange
        var kpiId = Guid.NewGuid();
        var expectedKpi = new KpiResponse(kpiId, "KPI_1", "Test KPI", null, null, null, null, true, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);

        _kpiServiceMock
            .Setup(s => s.GetByIdAsync(kpiId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedKpi);

        // Act
        var result = await _controller.GetKpi(kpiId, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<KpiResponse>();
    }

    [Fact]
    public async Task GetKpi_ShouldReturnNotFound_WhenNotExists()
    {
        // Arrange
        var kpiId = Guid.NewGuid();
        _kpiServiceMock
            .Setup(s => s.GetByIdAsync(kpiId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((KpiResponse?)null);

        // Act
        var result = await _controller.GetKpi(kpiId, CancellationToken.None);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

