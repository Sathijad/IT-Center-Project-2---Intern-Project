using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Schedules.Domain.Entities;
using Schedules.Domain.Enums;
using TaskStatusEnum = Schedules.Domain.Enums.TaskStatus;

namespace Schedules.Infrastructure.Data;

public class SchedulesDbContext(DbContextOptions<SchedulesDbContext> options) : DbContext(options)
{
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskNote> TaskNotes => Set<TaskNote>();
    public DbSet<RecurrencePattern> Recurrences => Set<RecurrencePattern>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureSchedules(modelBuilder);
        ConfigureRecurrences(modelBuilder);
        ConfigureTasks(modelBuilder);
        ConfigureTaskNotes(modelBuilder);
        ConfigureImportJobs(modelBuilder);
        SeedReferenceData(modelBuilder);
    }

    private static void ConfigureSchedules(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Schedule>();

        entity.ToTable("schedules");
        entity.HasKey(x => x.ScheduleId);
        entity.Property(x => x.ScheduleId).HasColumnName("schedule_id");
        entity.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        entity.Property(x => x.TeamId).HasColumnName("team_id");
        entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(120).IsRequired();
        entity.Property(x => x.Description).HasColumnName("description");
        entity.Property(x => x.StartTime).HasColumnName("start_time");
        entity.Property(x => x.EndTime).HasColumnName("end_time");
        entity.Property(x => x.IsAllDay).HasColumnName("is_all_day");
        entity.Property(x => x.Source).HasColumnName("source")
            .HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.CalendarEventId).HasColumnName("calendar_event_id").HasMaxLength(255);
        entity.Property(x => x.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.CreatedBy).HasColumnName("created_by");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.Property(x => x.RecurrenceId).HasColumnName("recurrence_id");
        entity.HasIndex(x => new { x.UserId, x.StartTime }).HasDatabaseName("idx_schedules_user_start");
        // Unique index also optimizes conflict detection queries (overlap checks)
        entity.HasIndex(x => new { x.UserId, x.StartTime, x.EndTime }).IsUnique();

        entity.HasOne(x => x.Recurrence)
            .WithMany(r => r.Schedules)
            .HasForeignKey(x => x.RecurrenceId);
    }

    private static void ConfigureRecurrences(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<RecurrencePattern>();
        entity.ToTable("recurrences");
        entity.HasKey(x => x.RecurrencePatternId);
        entity.Property(x => x.RecurrencePatternId).HasColumnName("recurrence_id");
        entity.Property(x => x.Pattern).HasColumnName("pattern").HasMaxLength(30);
        entity.Property(x => x.Interval).HasColumnName("interval");
        entity.Property(x => x.ByDay).HasColumnName("by_day").HasMaxLength(50);
        entity.Property(x => x.ByMonthDay).HasColumnName("by_month_day").HasMaxLength(50);
        entity.Property(x => x.Until).HasColumnName("until");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
    }

    private static void ConfigureTasks(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TaskItem>();
        entity.ToTable("tasks");
        entity.HasKey(x => x.TaskItemId);
        entity.Property(x => x.TaskItemId).HasColumnName("task_id");
        entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(160).IsRequired();
        entity.Property(x => x.Description).HasColumnName("description");
        entity.Property(x => x.AssigneeId).HasColumnName("assignee_id").IsRequired();
        entity.Property(x => x.ScheduleId).HasColumnName("schedule_id");
        entity.Property(x => x.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(20);
        entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
        entity.Property(x => x.DueDate).HasColumnName("due_date");
        entity.Property(x => x.Tags).HasColumnName("tags");
        entity.Property(x => x.MsGraphItemId).HasColumnName("ms_graph_item_id").HasMaxLength(255);
        entity.Property(x => x.CreatedBy).HasColumnName("created_by");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(x => x.Schedule)
            .WithMany(s => s.Tasks)
            .HasForeignKey(x => x.ScheduleId);
        entity.HasIndex(x => new { x.AssigneeId, x.Status }).HasDatabaseName("idx_tasks_assignee_status");
        entity.Property(x => x.Tags)
            .HasColumnType("text[]");
    }

    private static void ConfigureTaskNotes(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TaskNote>();
        entity.ToTable("task_notes");
        entity.HasKey(x => x.TaskNoteId);
        entity.Property(x => x.TaskNoteId).HasColumnName("note_id");
        entity.Property(x => x.TaskItemId).HasColumnName("task_id");
        entity.Property(x => x.AuthorId).HasColumnName("author_id");
        entity.Property(x => x.Body).HasColumnName("body");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(x => x.TaskItemId).HasDatabaseName("idx_task_notes_task");
        entity.HasOne(x => x.Task)
            .WithMany(t => t.Notes)
            .HasForeignKey(x => x.TaskItemId);
    }

    private static void ConfigureImportJobs(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ImportJob>();
        entity.ToTable("import_jobs");
        entity.HasKey(x => x.ImportJobId);
        entity.Property(x => x.ImportJobId).HasColumnName("job_id");
        entity.Property(x => x.JobType).HasColumnName("job_type").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.RequestedBy).HasColumnName("requested_by");
        entity.Property(x => x.FilePath).HasColumnName("file_path").HasMaxLength(500);
        // Map enum to database constraint values:
        // Queued -> "QUEUED", Running -> "PROCESSING", Succeeded -> "COMPLETED", Failed -> "FAILED", Cancelled -> "CANCELLED
        var statusConverter = new ValueConverter<ImportJobStatus, string>(
            v => v == ImportJobStatus.Queued ? "QUEUED" :
                 v == ImportJobStatus.Running ? "PROCESSING" :
                 v == ImportJobStatus.Succeeded ? "COMPLETED" :
                 v == ImportJobStatus.Failed ? "FAILED" :
                 v == ImportJobStatus.Cancelled ? "CANCELLED" : v.ToString().ToUpperInvariant(),
            v => v == "QUEUED" ? ImportJobStatus.Queued :
                 v == "PROCESSING" ? ImportJobStatus.Running :
                 v == "COMPLETED" ? ImportJobStatus.Succeeded :
                 v == "FAILED" ? ImportJobStatus.Failed :
                 v == "CANCELLED" ? ImportJobStatus.Cancelled :
                 (ImportJobStatus)Enum.Parse(typeof(ImportJobStatus), v, true));
        entity.Property(x => x.Status).HasColumnName("status").HasConversion(statusConverter).HasMaxLength(20);
        entity.Property(x => x.ErrorDetails).HasColumnName("error_details");
        entity.Property(x => x.ProcessedCount).HasColumnName("processed_count");
        entity.Property(x => x.FailedCount).HasColumnName("failed_count");
        entity.Property(x => x.StartedAt).HasColumnName("started_at");
        entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(x => x.Status).HasDatabaseName("idx_import_jobs_status");
    }

    private static void SeedReferenceData(ModelBuilder modelBuilder)
    {
        // NOTE: Seed data is commented out to avoid conflicts during development
        // Uncomment and run migrations if you need seed data for testing
        /*
        var scheduleId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-111111111111");
        var taskId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-222222222222");
        var noteId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-333333333333");
        var recurrenceId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-444444444444");
        var seedBaseline = new DateTimeOffset(2025, 1, 6, 0, 0, 0, TimeSpan.Zero);
        var createdTimestamp = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        modelBuilder.Entity<RecurrencePattern>().HasData(new RecurrencePattern
        {
            RecurrencePatternId = recurrenceId,
            Pattern = "WEEKLY",
            Interval = 1,
            ByDay = "MO,WE,FR",
            CreatedAt = createdTimestamp
        });

        modelBuilder.Entity<Schedule>().HasData(new Schedule
        {
            ScheduleId = scheduleId,
            UserId = 1,
            TeamId = 10,
            Title = "Sample Onsite Shift",
            Description = "Seeded schedule for QA validation",
            StartTime = seedBaseline.AddHours(9),
            EndTime = seedBaseline.AddHours(17),
            IsAllDay = false,
            Source = ScheduleSource.Internal,
            Status = ScheduleStatus.Confirmed,
            RecurrenceId = recurrenceId,
            CreatedBy = 1,
            CreatedAt = createdTimestamp,
            UpdatedAt = createdTimestamp
        });
        */

        /*
        modelBuilder.Entity<TaskItem>().HasData(new TaskItem
        {
            TaskItemId = taskId,
            Title = "Seed Task",
            Description = "Initial seeded task for smoke testing",
            AssigneeId = 1,
            ScheduleId = scheduleId,
            Priority = TaskPriority.High,
            Status = TaskStatusEnum.InProgress,
            DueDate = seedBaseline.AddDays(1).AddHours(17),
            Tags = new[] { "seed", "demo" },
            CreatedBy = 2,
            CreatedAt = createdTimestamp,
            UpdatedAt = createdTimestamp
        });

        modelBuilder.Entity<TaskNote>().HasData(new TaskNote
        {
            TaskNoteId = noteId,
            TaskItemId = taskId,
            AuthorId = 2,
            Body = "Seeded comment for validation.",
            CreatedAt = createdTimestamp,
            UpdatedAt = createdTimestamp
        });
        */
    }
}

