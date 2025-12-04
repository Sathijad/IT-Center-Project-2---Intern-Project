using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Domain.Enums;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class KpiActualServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly KpiActualService _service;

    public KpiActualServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new KpiActualService(_dbContext);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateActual_WhenValidRequest()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "ACTUAL_KPI");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiActualRequest(
            KpiId: kpi.KpiId,
            UserId: 100,
            TeamId: null,
            MeasuredAt: DateTimeOffset.UtcNow,
            PeriodStart: null,
            PeriodEnd: null,
            Value: 95m);

        // Act
        var result = await _service.CreateAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.KpiId.Should().Be(kpi.KpiId);
        result.Value.Should().Be(95m);
        result.UserId.Should().Be(100);
        result.SourceType.Should().Be(KpiSourceType.Manual.ToString());

        var actualInDb = await _dbContext.KpiActuals.FirstOrDefaultAsync();
        actualInDb.Should().NotBeNull();
        actualInDb!.SourceType.Should().Be(KpiSourceType.Manual);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowNotFoundException_WhenKpiNotExists()
    {
        // Arrange
        var request = new CreateKpiActualRequest(
            KpiId: Guid.NewGuid(),
            UserId: null,
            TeamId: null,
            MeasuredAt: DateTimeOffset.UtcNow,
            PeriodStart: null,
            PeriodEnd: null,
            Value: 95m);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.CreateAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowNotFoundException_WhenKpiInactive()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "INACTIVE_KPI", isActive: false);
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiActualRequest(
            KpiId: kpi.KpiId,
            UserId: null,
            TeamId: null,
            MeasuredAt: DateTimeOffset.UtcNow,
            PeriodStart: null,
            PeriodEnd: null,
            Value: 95m);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.CreateAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task GetByUserAsync_ShouldReturnActualsForUser()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "USER_ACTUALS");
        _dbContext.Kpis.Add(kpi);
        
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, userId: 100, value: 50m);
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, userId: 100, value: 60m);
        var actual3 = TestDataBuilder.CreateKpiActual(kpiId: kpi.KpiId, userId: 200, value: 70m);
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByUserAsync(100, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Select(a => a.Value).Should().Contain(new[] { 50m, 60m });
        result.Should().NotContain(a => a.Value == 70m);
    }

    [Fact]
    public async Task GetByUserAsync_ShouldOrderByMeasuredAtDescending()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "ORDERED_ACTUALS");
        _dbContext.Kpis.Add(kpi);
        
        var now = DateTimeOffset.UtcNow;
        var actual1 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            userId: 100,
            value: 50m,
            measuredAt: now.AddDays(-2));
        var actual2 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            userId: 100,
            value: 60m,
            measuredAt: now);
        var actual3 = TestDataBuilder.CreateKpiActual(
            kpiId: kpi.KpiId,
            userId: 100,
            value: 70m,
            measuredAt: now.AddDays(-1));
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByUserAsync(100, CancellationToken.None);

        // Assert
        result.Should().HaveCount(3);
        result.Select(a => a.Value).Should().BeEquivalentTo(new[] { 60m, 70m, 50m });
    }

    [Fact]
    public async Task GetByKpiAsync_ShouldReturnActualsForKpi()
    {
        // Arrange
        var kpi1 = TestDataBuilder.CreateKpi(code: "KPI_1");
        var kpi2 = TestDataBuilder.CreateKpi(code: "KPI_2");
        _dbContext.Kpis.AddRange(kpi1, kpi2);
        
        var actual1 = TestDataBuilder.CreateKpiActual(kpiId: kpi1.KpiId, value: 50m);
        var actual2 = TestDataBuilder.CreateKpiActual(kpiId: kpi1.KpiId, value: 60m);
        var actual3 = TestDataBuilder.CreateKpiActual(kpiId: kpi2.KpiId, value: 70m);
        _dbContext.KpiActuals.AddRange(actual1, actual2, actual3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByKpiAsync(kpi1.KpiId, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Select(a => a.Value).Should().Contain(new[] { 50m, 60m });
        result.Should().NotContain(a => a.Value == 70m);
    }

    [Fact]
    public async Task CreateAsync_ShouldSupportTeamActuals()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TEAM_ACTUAL");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiActualRequest(
            KpiId: kpi.KpiId,
            UserId: null,
            TeamId: 5,
            MeasuredAt: DateTimeOffset.UtcNow,
            PeriodStart: null,
            PeriodEnd: null,
            Value: 85m);

        // Act
        var result = await _service.CreateAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.TeamId.Should().Be(5);
        result.UserId.Should().BeNull();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

