namespace Schedules.Api.Options;

public class FeatureFlagOptions
{
    public bool EnableMsGraphSync { get; set; }
    public bool EnableTaskNotifications { get; set; }
    public bool EnableBulkImport { get; set; }
    public bool EnableMobileTaskComments { get; set; } = true;
}

