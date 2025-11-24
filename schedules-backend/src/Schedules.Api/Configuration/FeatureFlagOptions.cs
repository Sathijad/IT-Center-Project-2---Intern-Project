namespace Schedules.Configuration;

public class FeatureFlagOptions
{
    public const string SectionName = "FeatureFlags";
    public bool EnableMsGraphSync { get; set; }
    public bool EnableTaskNotifications { get; set; }
    public bool EnableBulkImport { get; set; }
}

