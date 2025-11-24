using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Schedules.Infrastructure.Data;

#nullable disable

namespace Schedules.Infrastructure.Migrations;

[DbContext(typeof(SchedulesDbContext))]
partial class SchedulesDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder.HasAnnotation("ProductVersion", "9.0.0");

        modelBuilder.Entity("Schedules.Domain.Entities.ImportJob", b =>
            {
                b.Property<Guid>("ImportJobId")
                    .HasColumnName("job_id");

                b.Property<DateTimeOffset?>("CompletedAt")
                    .HasColumnName("completed_at");

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnName("created_at");

                b.Property<string>("ErrorDetails")
                    .HasColumnName("error_details");

                b.Property<int>("FailedCount")
                    .HasColumnName("failed_count");

                b.Property<string>("FilePath")
                    .IsRequired()
                    .HasColumnName("file_path")
                    .HasMaxLength(500);

                b.Property<string>("JobType")
                    .IsRequired()
                    .HasColumnName("job_type")
                    .HasMaxLength(30);

                b.Property<int>("ProcessedCount")
                    .HasColumnName("processed_count");

                b.Property<long>("RequestedBy")
                    .HasColumnName("requested_by");

                b.Property<DateTimeOffset?>("StartedAt")
                    .HasColumnName("started_at");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasColumnName("status")
                    .HasMaxLength(20);

                b.HasKey("ImportJobId");

                b.HasIndex("Status")
                    .HasDatabaseName("idx_import_jobs_status");

                b.ToTable("import_jobs");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.RecurrencePattern", b =>
            {
                b.Property<Guid>("RecurrencePatternId")
                    .HasColumnName("recurrence_id");

                b.Property<string>("ByDay")
                    .HasColumnName("by_day")
                    .HasMaxLength(50);

                b.Property<string>("ByMonthDay")
                    .HasColumnName("by_month_day")
                    .HasMaxLength(50);

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnName("created_at");

                b.Property<int>("Interval")
                    .HasColumnName("interval");

                b.Property<string>("Pattern")
                    .IsRequired()
                    .HasColumnName("pattern")
                    .HasMaxLength(30);

                b.Property<DateTimeOffset?>("Until")
                    .HasColumnName("until");

                b.HasKey("RecurrencePatternId");

                b.ToTable("recurrences");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.Schedule", b =>
            {
                b.Property<Guid>("ScheduleId")
                    .HasColumnName("schedule_id");

                b.Property<string>("CalendarEventId")
                    .HasColumnName("calendar_event_id")
                    .HasMaxLength(255);

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnName("created_at");

                b.Property<long>("CreatedBy")
                    .HasColumnName("created_by");

                b.Property<string>("Description")
                    .HasColumnName("description");

                b.Property<DateTimeOffset>("EndTime")
                    .HasColumnName("end_time");

                b.Property<bool>("IsAllDay")
                    .HasColumnName("is_all_day");

                b.Property<Guid?>("RecurrenceId")
                    .HasColumnName("recurrence_id");

                b.Property<string>("Source")
                    .IsRequired()
                    .HasColumnName("source")
                    .HasMaxLength(30);

                b.Property<DateTimeOffset>("StartTime")
                    .HasColumnName("start_time");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasColumnName("status")
                    .HasMaxLength(30);

                b.Property<long?>("TeamId")
                    .HasColumnName("team_id");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasColumnName("title")
                    .HasMaxLength(120);

                b.Property<DateTimeOffset>("UpdatedAt")
                    .HasColumnName("updated_at");

                b.Property<long>("UserId")
                    .HasColumnName("user_id");

                b.HasKey("ScheduleId");

                b.HasIndex("RecurrenceId");

                b.HasIndex("UserId", "StartTime")
                    .HasDatabaseName("idx_schedules_user_start");

                b.HasIndex("UserId", "StartTime", "EndTime")
                    .IsUnique()
                    .HasDatabaseName("IX_schedules_user_id_start_time_end_time");

                b.ToTable("schedules");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.TaskItem", b =>
            {
                b.Property<Guid>("TaskItemId")
                    .HasColumnName("task_id");

                b.Property<long>("AssigneeId")
                    .HasColumnName("assignee_id");

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnName("created_at");

                b.Property<long>("CreatedBy")
                    .HasColumnName("created_by");

                b.Property<string>("Description")
                    .HasColumnName("description");

                b.Property<DateTimeOffset?>("DueDate")
                    .HasColumnName("due_date");

                b.Property<string>("MsGraphItemId")
                    .HasColumnName("ms_graph_item_id")
                    .HasMaxLength(255);

                b.Property<string>("Priority")
                    .IsRequired()
                    .HasColumnName("priority")
                    .HasMaxLength(20);

                b.Property<Guid?>("ScheduleId")
                    .HasColumnName("schedule_id");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasColumnName("status")
                    .HasMaxLength(20);

                b.Property<string[]>("Tags")
                    .IsRequired()
                    .HasColumnType("text[]")
                    .HasColumnName("tags");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasColumnName("title")
                    .HasMaxLength(160);

                b.Property<DateTimeOffset>("UpdatedAt")
                    .HasColumnName("updated_at");

                b.HasKey("TaskItemId");

                b.HasIndex("ScheduleId");

                b.HasIndex("AssigneeId", "Status")
                    .HasDatabaseName("idx_tasks_assignee_status");

                b.ToTable("tasks");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.TaskNote", b =>
            {
                b.Property<Guid>("TaskNoteId")
                    .HasColumnName("note_id");

                b.Property<long>("AuthorId")
                    .HasColumnName("author_id");

                b.Property<string>("Body")
                    .IsRequired()
                    .HasColumnName("body");

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnName("created_at");

                b.Property<Guid>("TaskItemId")
                    .HasColumnName("task_id");

                b.Property<DateTimeOffset>("UpdatedAt")
                    .HasColumnName("updated_at");

                b.HasKey("TaskNoteId");

                b.HasIndex("TaskItemId")
                    .HasDatabaseName("idx_task_notes_task");

                b.ToTable("task_notes");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.Schedule", b =>
            {
                b.HasOne("Schedules.Domain.Entities.RecurrencePattern", "Recurrence")
                    .WithMany("Schedules")
                    .HasForeignKey("RecurrenceId");

                b.Navigation("Recurrence");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.TaskItem", b =>
            {
                b.HasOne("Schedules.Domain.Entities.Schedule", "Schedule")
                    .WithMany("Tasks")
                    .HasForeignKey("ScheduleId");

                b.Navigation("Schedule");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.TaskNote", b =>
            {
                b.HasOne("Schedules.Domain.Entities.TaskItem", "Task")
                    .WithMany("Notes")
                    .HasForeignKey("TaskItemId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.Navigation("Task");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.RecurrencePattern", b =>
            {
                b.Navigation("Schedules");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.Schedule", b =>
            {
                b.Navigation("Tasks");
            });

        modelBuilder.Entity("Schedules.Domain.Entities.TaskItem", b =>
            {
                b.Navigation("Notes");
            });
#pragma warning restore 612, 618
    }
}

