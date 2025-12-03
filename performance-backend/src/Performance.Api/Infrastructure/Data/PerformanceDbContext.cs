using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Performance.Domain.Entities;
using Performance.Domain.Enums;

namespace Performance.Infrastructure.Data;

public class PerformanceDbContext(DbContextOptions<PerformanceDbContext> options) : DbContext(options)
{
    public DbSet<Kpi> Kpis => Set<Kpi>();
    public DbSet<KpiTarget> KpiTargets => Set<KpiTarget>();
    public DbSet<KpiActual> KpiActuals => Set<KpiActual>();
    public DbSet<TrainingCourse> TrainingCourses => Set<TrainingCourse>();
    public DbSet<TrainingAssignment> TrainingAssignments => Set<TrainingAssignment>();
    public DbSet<TrainingNote> TrainingNotes => Set<TrainingNote>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureKpis(modelBuilder);
        ConfigureKpiTargets(modelBuilder);
        ConfigureKpiActuals(modelBuilder);
        ConfigureTrainingCourses(modelBuilder);
        ConfigureTrainingAssignments(modelBuilder);
        ConfigureTrainingNotes(modelBuilder);
        ConfigureImportJobs(modelBuilder);
    }

    private static void ConfigureKpis(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Kpi>();
        entity.ToTable("kpis");
        entity.HasKey(x => x.KpiId);
        entity.Property(x => x.KpiId).HasColumnName("kpi_id");
        entity.Property(x => x.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
        entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        entity.Property(x => x.Description).HasColumnName("description");
        entity.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(50);
        entity.Property(x => x.Category).HasColumnName("category").HasMaxLength(100);
        entity.Property(x => x.CalculationHint).HasColumnName("calculation_hint");
        entity.Property(x => x.IsActive).HasColumnName("is_active");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(x => x.Code).IsUnique().HasFilter("[is_active] = 1");
    }

    private static void ConfigureKpiTargets(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<KpiTarget>();
        entity.ToTable("kpi_targets");
        entity.HasKey(x => x.TargetId);
        entity.Property(x => x.TargetId).HasColumnName("target_id");
        entity.Property(x => x.KpiId).HasColumnName("kpi_id").IsRequired();
        entity.Property(x => x.UserId).HasColumnName("user_id");
        entity.Property(x => x.TeamId).HasColumnName("team_id");
        entity.Property(x => x.PeriodType).HasColumnName("period_type").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.PeriodStart).HasColumnName("period_start").HasConversion<DateOnlyConverter>();
        entity.Property(x => x.PeriodEnd).HasColumnName("period_end").HasConversion<DateOnlyConverter>();
        entity.Property(x => x.TargetValue).HasColumnName("target_value").HasPrecision(18, 4);
        entity.Property(x => x.CreatedBy).HasColumnName("created_by");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(x => x.Kpi).WithMany(k => k.Targets).HasForeignKey(x => x.KpiId);
        entity.HasIndex(x => x.KpiId);
        entity.HasIndex(x => x.UserId).HasFilter("[user_id] IS NOT NULL");
        entity.HasIndex(x => x.TeamId).HasFilter("[team_id] IS NOT NULL");
    }

    private static void ConfigureKpiActuals(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<KpiActual>();
        entity.ToTable("kpi_actuals");
        entity.HasKey(x => x.ActualId);
        entity.Property(x => x.ActualId).HasColumnName("actual_id");
        entity.Property(x => x.KpiId).HasColumnName("kpi_id").IsRequired();
        entity.Property(x => x.UserId).HasColumnName("user_id");
        entity.Property(x => x.TeamId).HasColumnName("team_id");
        entity.Property(x => x.MeasuredAt).HasColumnName("measured_at");
        entity.Property(x => x.PeriodStart).HasColumnName("period_start").HasConversion<DateOnlyConverter>();
        entity.Property(x => x.PeriodEnd).HasColumnName("period_end").HasConversion<DateOnlyConverter>();
        entity.Property(x => x.Value).HasColumnName("value").HasPrecision(18, 4);
        entity.Property(x => x.SourceType).HasColumnName("source_type").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.ImportJobId).HasColumnName("import_job_id");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.HasOne(x => x.Kpi).WithMany(k => k.Actuals).HasForeignKey(x => x.KpiId);
        entity.HasOne(x => x.ImportJob).WithMany(j => j.KpiActuals).HasForeignKey(x => x.ImportJobId);
        entity.HasIndex(x => x.KpiId);
        entity.HasIndex(x => x.UserId).HasFilter("[user_id] IS NOT NULL");
        entity.HasIndex(x => x.TeamId).HasFilter("[team_id] IS NOT NULL");
        entity.HasIndex(x => x.MeasuredAt);
        entity.HasIndex(x => x.ImportJobId).HasFilter("[import_job_id] IS NOT NULL");
    }

    private static void ConfigureTrainingCourses(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TrainingCourse>();
        entity.ToTable("training_courses");
        entity.HasKey(x => x.CourseId);
        entity.Property(x => x.CourseId).HasColumnName("course_id");
        entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(300).IsRequired();
        entity.Property(x => x.Description).HasColumnName("description");
        entity.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(200);
        entity.Property(x => x.Modality).HasColumnName("modality").HasConversion<string>().HasMaxLength(50);
        entity.Property(x => x.TeamsMeetingUrl).HasColumnName("teams_meeting_url");
        entity.Property(x => x.SharePointUrl).HasColumnName("sharepoint_url");
        entity.Property(x => x.OneDriveUrl).HasColumnName("onedrive_url");
        entity.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
        entity.Property(x => x.IsActive).HasColumnName("is_active");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(x => x.IsActive).HasFilter("[is_active] = 1");
    }

    private static void ConfigureTrainingAssignments(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TrainingAssignment>();
        entity.ToTable("training_assignments");
        entity.HasKey(x => x.AssignmentId);
        entity.Property(x => x.AssignmentId).HasColumnName("assignment_id");
        entity.Property(x => x.CourseId).HasColumnName("course_id").IsRequired();
        entity.Property(x => x.AssigneeType).HasColumnName("assignee_type").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.AssigneeId).HasColumnName("assignee_id");
        entity.Property(x => x.CohortId).HasColumnName("cohort_id").HasMaxLength(100);
        entity.Property(x => x.DueDate).HasColumnName("due_date");
        entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.Progress).HasColumnName("progress");
        entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
        entity.Property(x => x.AssignedBy).HasColumnName("assigned_by");
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(x => x.Course).WithMany(c => c.Assignments).HasForeignKey(x => x.CourseId);
        entity.HasIndex(x => x.CourseId);
        entity.HasIndex(x => x.AssigneeId).HasFilter("[assignee_id] IS NOT NULL");
        entity.HasIndex(x => x.Status);
        entity.HasIndex(x => x.DueDate).HasFilter("[due_date] IS NOT NULL");
    }

    private static void ConfigureTrainingNotes(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TrainingNote>();
        entity.ToTable("training_notes");
        entity.HasKey(x => x.NoteId);
        entity.Property(x => x.NoteId).HasColumnName("note_id");
        entity.Property(x => x.AssignmentId).HasColumnName("assignment_id").IsRequired();
        entity.Property(x => x.AuthorId).HasColumnName("author_id");
        entity.Property(x => x.NoteType).HasColumnName("note_type").HasConversion<string>().HasMaxLength(30);
        entity.Property(x => x.Content).HasColumnName("content").IsRequired();
        entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(x => x.Assignment).WithMany(a => a.Notes).HasForeignKey(x => x.AssignmentId);
        entity.HasIndex(x => x.AssignmentId);
        entity.HasIndex(x => x.AuthorId);
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
        entity.HasIndex(x => x.Status);
        entity.HasIndex(x => x.RequestedBy);
        entity.HasIndex(x => x.CreatedAt).IsDescending();
    }
}

// Helper converter for DateOnly (EF Core 9.0+ supports DateOnly natively, but we need explicit conversion for PostgreSQL)
public class DateOnlyConverter : ValueConverter<DateOnly, DateTime>
{
    public DateOnlyConverter() : base(
        d => d.ToDateTime(TimeOnly.MinValue),
        d => DateOnly.FromDateTime(d))
    {
    }
}

