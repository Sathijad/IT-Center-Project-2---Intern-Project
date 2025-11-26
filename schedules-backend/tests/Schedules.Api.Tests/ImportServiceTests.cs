using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Schedules.Contracts.Imports;
using Schedules.Errors;
using Schedules.Services;
using Xunit;

namespace Schedules.Api.Tests;

public class ImportServiceTests
{
    [Fact]
    public async Task StartScheduleImportAsync_CreatesJobAndFiles()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), "schedules-import-" + Guid.NewGuid());
        Directory.CreateDirectory(tempRoot);
        try
        {
            var env = new TestUtilities.TestWebHostEnvironment(tempRoot);
            await using var context = TestUtilities.CreateContext();
            var jobClient = new TestUtilities.RecordingBackgroundJobClient();
            var service = new ImportService(env, context, jobClient, NullLogger<ImportService>.Instance);

            var request = new ImportRequest(
                "shifts.csv",
                Convert.ToBase64String(Encoding.UTF8.GetBytes("sample")),
                DryRun: false);

            var response = await service.StartScheduleImportAsync(request, actorId: 11, CancellationToken.None);

            var storedJob = await context.ImportJobs.FirstOrDefaultAsync();
            Assert.NotNull(storedJob);
            Assert.Equal(response.JobId, storedJob!.ImportJobId);
            Assert.True(File.Exists(storedJob.FilePath));
            Assert.Single(jobClient.CreatedJobs);
        }
        finally
        {
            if (Directory.Exists(tempRoot))
            {
                Directory.Delete(tempRoot, recursive: true);
            }
        }
    }

    [Fact]
    public async Task GetJobAsync_NonExisting_ThrowsNotFound()
    {
        await using var context = TestUtilities.CreateContext();
        var service = new ImportService(
            new TestUtilities.TestWebHostEnvironment(Path.GetTempPath()),
            context,
            new TestUtilities.RecordingBackgroundJobClient(),
            NullLogger<ImportService>.Instance);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.GetJobAsync(Guid.NewGuid(), CancellationToken.None));
    }
}

