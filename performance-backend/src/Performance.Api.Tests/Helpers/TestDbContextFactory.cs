using Microsoft.EntityFrameworkCore;
using Performance.Infrastructure.Data;

namespace Performance.Api.Tests.Helpers;

public static class TestDbContextFactory
{
    public static PerformanceDbContext CreateInMemoryDbContext(string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<PerformanceDbContext>()
            .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString())
            .Options;

        return new PerformanceDbContext(options);
    }

    public static IDbContextFactory<PerformanceDbContext> CreateFactory(string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<PerformanceDbContext>()
            .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString())
            .Options;

        return new TestDbContextFactoryImpl(options);
    }

    private class TestDbContextFactoryImpl : IDbContextFactory<PerformanceDbContext>
    {
        private readonly DbContextOptions<PerformanceDbContext> _options;

        public TestDbContextFactoryImpl(DbContextOptions<PerformanceDbContext> options)
        {
            _options = options;
        }

        public PerformanceDbContext CreateDbContext()
        {
            return new PerformanceDbContext(_options);
        }
    }
}

