using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Schedules.Api.Domain.Entities;

namespace Schedules.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<Recurrence> Recurrences => Set<Recurrence>();
    public DbSet<TaskEntity> Tasks => Set<TaskEntity>();
    public DbSet<TaskNote> TaskNotes => Set<TaskNote>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureSchedule(modelBuilder.Entity<Schedule>());
        ConfigureRecurrence(modelBuilder.Entity<Recurrence>());
        ConfigureTask(modelBuilder.Entity<TaskEntity>());
        ConfigureTaskNote(modelBuilder.Entity<TaskNote>());
        ConfigureImportJob(modelBuilder.Entity<ImportJob>());
    }

    private static void ConfigureSchedule(EntityTypeBuilder<Schedule> builder)
    {
        builder.ToTable("schedules");
        builder.HasKey(x => x.ScheduleId);
        builder.Property(x => x.ScheduleId).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Metadata).HasColumnType("jsonb");
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(x => new { x.UserId, x.StartTime }).HasDatabaseName("idx_schedules_user_start");
        builder.HasIndex(x => new { x.TeamId, x.StartTime }).HasDatabaseName("idx_schedules_team_start");
        builder.HasOne(x => x.Recurrence)
            .WithMany(r => r.Schedules)
            .HasForeignKey(x => x.RecurrenceId);
    }

    private static void ConfigureRecurrence(EntityTypeBuilder<Recurrence> builder)
    {
        builder.ToTable("recurrences");
        builder.HasKey(x => x.RecurrenceId);
        builder.Property(x => x.RecurrenceId).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.ByDay).HasMaxLength(50);
        builder.Property(x => x.Timezone).HasMaxLength(64);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
    }

    private static void ConfigureTask(EntityTypeBuilder<TaskEntity> builder)
    {
        builder.ToTable("tasks");
        builder.HasKey(x => x.TaskId);
        builder.Property(x => x.TaskId).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Title).HasMaxLength(150);
        builder.Property(x => x.Metadata).HasColumnType("jsonb");
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(x => new { x.AssigneeId, x.Status, x.DueDate }).HasDatabaseName("idx_tasks_assignee_status");
        builder.HasOne(x => x.Schedule)
            .WithMany(s => s.Tasks)
            .HasForeignKey(x => x.ScheduleId);
    }

    private static void ConfigureTaskNote(EntityTypeBuilder<TaskNote> builder)
    {
        builder.ToTable("task_notes");
        builder.HasKey(x => x.NoteId);
        builder.Property(x => x.NoteId).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Attachments).HasColumnType("jsonb");
        builder.Property(x => x.Body).IsRequired();
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(x => x.TaskId).HasDatabaseName("idx_task_notes_task");
        builder.HasOne(x => x.Task)
            .WithMany(t => t.Notes)
            .HasForeignKey(x => x.TaskId);
    }

    private static void ConfigureImportJob(EntityTypeBuilder<ImportJob> builder)
    {
        builder.ToTable("import_jobs");
        builder.HasKey(x => x.JobId);
        builder.Property(x => x.JobId).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.ErrorDetails).HasColumnType("jsonb");
        builder.Property(x => x.JobType).HasMaxLength(30);
        builder.Property(x => x.StorageUrl).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("idx_import_jobs_status");
    }
}

