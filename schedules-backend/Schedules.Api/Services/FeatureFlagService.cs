using Microsoft.Extensions.Options;
using Schedules.Api.Options;

namespace Schedules.Api.Services;

public interface IFeatureFlagService
{
    bool IsMsGraphSyncEnabled();
    bool IsTaskNotificationEnabled();
    bool IsBulkImportEnabled();
    bool IsMobileTaskCommentsEnabled();
}

public class FeatureFlagService(IOptionsMonitor<FeatureFlagOptions> options) : IFeatureFlagService
{
    private FeatureFlagOptions Current => options.CurrentValue;

    public bool IsMsGraphSyncEnabled() => Current.EnableMsGraphSync;
    public bool IsTaskNotificationEnabled() => Current.EnableTaskNotifications;
    public bool IsBulkImportEnabled() => Current.EnableBulkImport;
    public bool IsMobileTaskCommentsEnabled() => Current.EnableMobileTaskComments;
}

