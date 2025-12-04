using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Performance;
using Performance.Domain.Entities;
using Performance.Errors;
using Performance.Infrastructure.Data;
using Performance.Services;
using Performance.Api.Tests.Helpers;
using Xunit;

namespace Performance.Api.Tests.Services;

public class KpiServiceTests : IDisposable
{
    private readonly PerformanceDbContext _dbContext;
    private readonly KpiService _service;

    public KpiServiceTests()
    {
        _dbContext = TestDbContextFactory.CreateInMemoryDbContext();
        _service = new KpiService(_dbContext);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateKpi_WhenValidRequest()
    {
        // Arrange
        var request = new CreateKpiRequest(
            Code: "TEST_KPI",
            Name: "Test KPI",
            Description: "Test Description",
            Unit: "Count",
            Category: "Test",
            CalculationHint: null);

        // Act
        var result = await _service.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Code.Should().Be("TEST_KPI");
        result.Name.Should().Be("Test KPI");
        result.IsActive.Should().BeTrue();

        var kpiInDb = await _dbContext.Kpis.FirstOrDefaultAsync(k => k.Code == "TEST_KPI");
        kpiInDb.Should().NotBeNull();
        kpiInDb!.Code.Should().Be("TEST_KPI");
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowConflictException_WhenCodeExists()
    {
        // Arrange
        var existingKpi = TestDataBuilder.CreateKpi(code: "EXISTING_KPI");
        _dbContext.Kpis.Add(existingKpi);
        await _dbContext.SaveChangesAsync();

        var request = new CreateKpiRequest(
            Code: "EXISTING_KPI",
            Name: "Duplicate KPI",
            Description: null,
            Unit: null,
            Category: null,
            CalculationHint: null);

        // Act & Assert
        await Assert.ThrowsAsync<ConflictException>(() => 
            _service.CreateAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnOnlyActiveKpis()
    {
        // Arrange
        var activeKpi = TestDataBuilder.CreateKpi(code: "ACTIVE", isActive: true);
        var inactiveKpi = TestDataBuilder.CreateKpi(code: "INACTIVE", isActive: false);
        _dbContext.Kpis.AddRange(activeKpi, inactiveKpi);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetAllAsync(CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().Code.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnKpisOrderedByCode()
    {
        // Arrange
        var kpi1 = TestDataBuilder.CreateKpi(code: "Z_KPI");
        var kpi2 = TestDataBuilder.CreateKpi(code: "A_KPI");
        var kpi3 = TestDataBuilder.CreateKpi(code: "M_KPI");
        _dbContext.Kpis.AddRange(kpi1, kpi2, kpi3);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetAllAsync(CancellationToken.None);

        // Assert
        result.Should().HaveCount(3);
        result.Select(k => k.Code).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetByCodeAsync_ShouldReturnKpi_WhenExists()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "FIND_ME");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByCodeAsync("FIND_ME", CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Code.Should().Be("FIND_ME");
        result.KpiId.Should().Be(kpi.KpiId);
    }

    [Fact]
    public async Task GetByCodeAsync_ShouldReturnNull_WhenNotExists()
    {
        // Act
        var result = await _service.GetByCodeAsync("NOT_FOUND", CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByCodeAsync_ShouldReturnNull_WhenInactive()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "INACTIVE", isActive: false);
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByCodeAsync("INACTIVE", CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnKpi_WhenExists()
    {
        // Arrange
        var kpi = TestDataBuilder.CreateKpi(code: "BY_ID");
        _dbContext.Kpis.Add(kpi);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _service.GetByIdAsync(kpi.KpiId, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.KpiId.Should().Be(kpi.KpiId);
        result.Code.Should().Be("BY_ID");
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotExists()
    {
        // Act
        var result = await _service.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}

