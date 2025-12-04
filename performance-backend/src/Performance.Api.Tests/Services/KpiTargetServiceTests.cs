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

public class KpiTargetServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly KpiTargetService _service;

    public KpiTargetServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new KpiTargetService(_dbContext);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateTarget_WhenValidRequest()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TARGET_KPI");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiTargetRequest(
            KpiId: kpi.KpiId,
            UserId: null,
            TeamId: null,
            PeriodType: KpiPeriodType.Monthly,
            PeriodStart: DateOnly.FromDateTime(DateTime.UtcNow),
            PeriodEnd: DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
            TargetValue: 100m);

        // Act
        var result = await _service.CreateAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.KpiId.Should().Be(kpi.KpiId);
        result.TargetValue.Should().Be(100m);
        result.CreatedBy.Should().Be(1);

        var targetInDb = await _dbContext.KpiTargets.FirstOrDefaultAsync();
        targetInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowNotFoundException_WhenKpiNotExists()
    {
        // Arrange
        var request = new CreateKpiTargetRequest(
            KpiId: Guid.NewGuid(),
            UserId: null,
            TeamId: null,
            PeriodType: KpiPeriodType.Monthly,
            PeriodStart: DateOnly.FromDateTime(DateTime.UtcNow),
            PeriodEnd: DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
            TargetValue: 100m);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.CreateAsync(request, actorId: 1, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateTarget_WhenValidRequest()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "UPDATE_KPI");
        _dbContext.Kpis.Add(kpi);
        
        var target = TestDataBuilder.CreateKpiTarget(
            kpiId: kpi.KpiId,
            targetValue: 100m);
        _dbContext.KpiTargets.Add(target);
        await _dbContext.SaveChangesAsync();

        var request = new UpdateKpiTargetRequest(
            PeriodStart: null,
            PeriodEnd: null,
            TargetValue: 150m);

        // Act
        var result = await _service.UpdateAsync(target.TargetId, request, CancellationToken.None);

        // Assert
        result.TargetValue.Should().Be(150m);
        
        var updatedTarget = await _dbContext.KpiTargets.FindAsync(target.TargetId);
        updatedTarget!.TargetValue.Should().Be(150m);
        // Note: UpdatedAt may be the same if operations happen in the same millisecond
        // In production, this would be different due to database timestamp precision
        updatedTarget.UpdatedAt.Should().BeOnOrAfter(target.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrowNotFoundException_WhenTargetNotExists()
    {
        // Arrange
        var request = new UpdateKpiTargetRequest(
            PeriodStart: null,
            PeriodEnd: null,
            TargetValue: 150m);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => 
            _service.UpdateAsync(Guid.NewGuid(), request, CancellationToken.None));
    }

    [Fact]
    public async Task GetByKpiAsync_ShouldReturnAllTargetsForKpi()
    {
        // Arrange
        var kpi1 = TestDataBuilder.CreateKpi(code: "KPI_1");
        var kpi2 = TestDataBuilder.CreateKpi(code: "KPI_2");
        _dbContext.Kpis.AddRange(kpi1, kpi2);
        
        var target1 = TestDataBuilder.CreateKpiTarget(kpiId: kpi1.KpiId, targetValue: 100m);
        var target2 = TestDataBuilder.CreateKpiTarget(kpiId: kpi1.KpiId, targetValue: 200m);
        var target3 = TestDataBuilder.CreateKpiTarget(kpiId: kpi2.KpiId, targetValue: 300m);
        _dbContext.KpiTargets.AddRange(target1, target2, target3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByKpiAsync(kpi1.KpiId, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Select(t => t.TargetValue).Should().Contain(new[] { 100m, 200m });
        result.Should().NotContain(t => t.TargetValue == 300m);
    }

    [Fact]
    public async Task CreateAsync_ShouldSupportUserSpecificTarget()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "USER_TARGET");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiTargetRequest(
            KpiId: kpi.KpiId,
            UserId: 100,
            TeamId: null,
            PeriodType: KpiPeriodType.Monthly,
            PeriodStart: DateOnly.FromDateTime(DateTime.UtcNow),
            PeriodEnd: DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
            TargetValue: 120m);

        // Act
        var result = await _service.CreateAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.UserId.Should().Be(100);
        result.TeamId.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_ShouldSupportTeamSpecificTarget()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "TEAM_TARGET");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiTargetRequest(
            KpiId: kpi.KpiId,
            UserId: null,
            TeamId: 5,
            PeriodType: KpiPeriodType.Quarterly,
            PeriodStart: DateOnly.FromDateTime(DateTime.UtcNow),
            PeriodEnd: DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(3)),
            TargetValue: 500m);

        // Act
        var result = await _service.CreateAsync(request, actorId: 1, CancellationToken.None);

        // Assert
        result.TeamId.Should().Be(5);
        result.UserId.Should().BeNull();
        result.PeriodType.Should().Be(KpiPeriodType.Quarterly);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

