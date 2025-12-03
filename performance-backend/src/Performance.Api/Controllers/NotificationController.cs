using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Performance.Contracts.Training;
using Performance.Extensions;
using Performance.Infrastructure.Data;
using Performance.Services.Interfaces;
using Performance.Workers;

namespace Performance.Controllers;

[ApiController]
[Route("api/v1/notify")]
public class NotificationController(
    INotificationService notificationService,
    IDbContextFactory<PerformanceDbContext> dbContextFactory,
    IBackgroundJobClient backgroundJobClient) : ControllerBase
{
    [HttpPost("staff")]
    [Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status202Accepted)]
    public async Task<ActionResult> NotifyStaff(
        [FromBody] NotifyStaffRequest request,
        CancellationToken cancellationToken)
    {
        var count = await notificationService.QueueNotificationsAsync(request, cancellationToken);

        // Enqueue background notification worker
        backgroundJobClient.Enqueue<TrainingNotificationWorker>(worker =>
            worker.SendNotificationsAsync(request, CancellationToken.None));

        return Accepted(new { queued = count, message = "Notifications queued for processing" });
    }
}

