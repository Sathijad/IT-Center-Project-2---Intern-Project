using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class MetricsServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly MetricsService _service;

    public MetricsServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new MetricsService(_dbContext);
    }

    [Fact]
    public async Task GetSnapshotAsync_ShouldReturnMetrics_WhenDataExists()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TEST_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var actual = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            value: 95m,
            measuredAt: DateTimeOffset.UtcNow);
        _dbContext.KpiActuals.Add(actual);
        
        var target = TestDataBuilder.CreateKpiTarget(
            kpiId: kpi.KpiId,
            targetValue: 100m);
        _dbContext.KpiTargets.Add(target);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(null, null, null, null, null);

        // Act
        var result = await _service.GetSnapshotAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        var metric = result.First();
        metric.KpiCode.Should().Be("TEST_KPI");
        metric.CurrentValue.Should().Be(95m);
        metric.TargetValue.Should().Be(100m);
        metric.Variance.Should().Be(-5m);
    }

    [Fact]
    public async Task GetSnapshotAsync_ShouldFilterByKpiCode()
    {
        // Arrange
        var kpi1 = TestDataBuilder.CreateKpi(code: "KPI_1");
        var kpi2 = TestDataBuilder.CreateKpi(code: "KPI_2");
        _dbContext.Kpis.AddRange(kpi1, kpi2);
        
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi1.KpiId, value: 50m);
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi2.KpiId, value: 60m);
        _dbContext.KpiActuals.AddRange(actual1, actual2);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(null, null, "KPI_1", null, null);

        // Act
        var result = await _service.GetSnapshotAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().KpiCode.Should().Be("KPI_1");
    }

    [Fact]
    public async Task GetSnapshotAsync_ShouldFilterByUserId()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "USER_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, userId: 100, value: 50m);
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, userId: 200, value: 60m);
        _dbContext.KpiActuals.AddRange(actual1, actual2);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(100, null, null, null, null);

        // Act
        var result = await _service.GetSnapshotAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().CurrentValue.Should().Be(50m);
    }

    [Fact]
    public async Task GetSnapshotAsync_ShouldFilterByDateRange()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "DATE_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var now = DateTimeOffset.UtcNow;
        var actual1 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            value: 50m,
            measuredAt: now.AddDays(-10));
        var actual2 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            value: 60m,
            measuredAt: now.AddDays(-5));
        var actual3 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            value: 70m,
            measuredAt: now.AddDays(-1));
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(
            null,
            null,
            null,
            now.AddDays(-7),
            now);

        // Act
        var result = await _service.GetSnapshotAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().CurrentValue.Should().Be(70m); // Latest within range
    }

    [Fact]
    public async Task GetSnapshotAsync_ShouldPrioritizeUserTarget_OverTeamTarget()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TARGET_PRIORITY");
        _dbContext.Kpis.Add(kpi);
        
        var userTarget = TestDataBuilder.CreateKpiTarget(
            kpiId: kpi.KpiId,
            userId: 100,
            targetValue: 90m);
        var teamTarget = TestDataBuilder.CreateKpiTarget(
            kpiId: kpi.KpiId,
            teamId: 1,
            targetValue: 100m);
        _dbContext.KpiTargets.AddRange(userTarget, teamTarget);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(100, null, null, null, null);

        // Act
        var result = await _service.GetSnapshotAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().TargetValue.Should().Be(90m); // User target should be used
    }

    [Fact]
    public async Task GetTimeSeriesAsync_ShouldReturnTimeSeriesData()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TIMESERIES_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var now = DateTimeOffset.UtcNow;
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 50m, measuredAt: now.AddDays(-2));
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 60m, measuredAt: now.AddDays(-1));
        var actual3 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 70m, measuredAt: now);
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(null, null, null, null, null);

        // Act
        var result = await _service.GetTimeSeriesAsync(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        var timeSeries = result.First();
        timeSeries.KpiCode.Should().Be("TIMESERIES_KPI");
        timeSeries.DataPoints.Should().HaveCount(3);
        timeSeries.DataPoints.Select(d => d.Value).Should().BeEquivalentTo(new[] { 50m, 60m, 70m });
    }

    [Fact]
    public async Task GetTimeSeriesAsync_ShouldOrderDataPointsByDate()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "ORDERED_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var now = DateTimeOffset.UtcNow;
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 70m, measuredAt: now);
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 50m, measuredAt: now.AddDays(-2));
        var actual3 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, value: 60m, measuredAt: now.AddDays(-1));
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        
        await _dbContext.SaveChangesAsync();

        var query = new MetricsQuery(null, null, null, null, null);

        // Act
        var result = await _service.GetTimeSeriesAsync(query, CancellationToken.None);

        // Assert
        var timeSeries = result.First();
        timeSeries.DataPoints.Should().BeInAscendingOrder(d => d.Timestamp);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

