namespace Schedules.Configuration;

public class JobOptions
{
    public const string SectionName = "Jobs";
    public string ReminderSchedule { get; set; } = "0 8 * * *";
    public string CsvBucket { get; set; } = string.Empty;
}

