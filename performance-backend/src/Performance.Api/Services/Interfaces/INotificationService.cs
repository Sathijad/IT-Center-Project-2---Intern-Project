using Performance.Contracts.Training;

namespace Performance.Services.Interfaces;

public interface INotificationService
{
    Task<int> QueueNotificationsAsync(NotifyStaffRequest request, CancellationToken cancellationToken);
}

