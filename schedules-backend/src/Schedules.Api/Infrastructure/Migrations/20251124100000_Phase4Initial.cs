using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedules.Infrastructure.Migrations;

public partial class Phase4Initial : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "import_jobs",
            columns: table => new
            {
                job_id = table.Column<Guid>(type: "uuid", nullable: false),
                job_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                requested_by = table.Column<long>(type: "bigint", nullable: false),
                file_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                error_details = table.Column<string>(type: "text", nullable: true),
                processed_count = table.Column<int>(type: "integer", nullable: false),
                failed_count = table.Column<int>(type: "integer", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_import_jobs", x => x.job_id);
            });

        migrationBuilder.CreateTable(
            name: "recurrences",
            columns: table => new
            {
                recurrence_id = table.Column<Guid>(type: "uuid", nullable: false),
                pattern = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                interval = table.Column<int>(type: "integer", nullable: false),
                by_day = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                by_month_day = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_recurrences", x => x.recurrence_id);
            });

        migrationBuilder.CreateTable(
            name: "schedules",
            columns: table => new
            {
                schedule_id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<long>(type: "bigint", nullable: false),
                team_id = table.Column<long>(type: "bigint", nullable: true),
                title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                description = table.Column<string>(type: "text", nullable: true),
                start_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                end_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                is_all_day = table.Column<bool>(type: "boolean", nullable: false),
                source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                calendar_event_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                recurrence_id = table.Column<Guid>(type: "uuid", nullable: true),
                created_by = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_schedules", x => x.schedule_id);
                table.ForeignKey(
                    name: "FK_schedules_recurrences_recurrence_id",
                    column: x => x.recurrence_id,
                    principalTable: "recurrences",
                    principalColumn: "recurrence_id");
            });

        migrationBuilder.CreateTable(
            name: "tasks",
            columns: table => new
            {
                task_id = table.Column<Guid>(type: "uuid", nullable: false),
                title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                description = table.Column<string>(type: "text", nullable: true),
                assignee_id = table.Column<long>(type: "bigint", nullable: false),
                schedule_id = table.Column<Guid>(type: "uuid", nullable: true),
                priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                due_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                tags = table.Column<string[]>(type: "text[]", nullable: false),
                ms_graph_item_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                created_by = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_tasks", x => x.task_id);
                table.ForeignKey(
                    name: "FK_tasks_schedules_schedule_id",
                    column: x => x.schedule_id,
                    principalTable: "schedules",
                    principalColumn: "schedule_id");
            });

        migrationBuilder.CreateTable(
            name: "task_notes",
            columns: table => new
            {
                note_id = table.Column<Guid>(type: "uuid", nullable: false),
                task_id = table.Column<Guid>(type: "uuid", nullable: false),
                author_id = table.Column<long>(type: "bigint", nullable: false),
                body = table.Column<string>(type: "text", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_task_notes", x => x.note_id);
                table.ForeignKey(
                    name: "FK_task_notes_tasks_task_id",
                    column: x => x.task_id,
                    principalTable: "tasks",
                    principalColumn: "task_id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "idx_import_jobs_status",
            table: "import_jobs",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "IX_schedules_recurrence_id",
            table: "schedules",
            column: "recurrence_id");

        migrationBuilder.CreateIndex(
            name: "idx_schedules_user_start",
            table: "schedules",
            columns: new[] { "user_id", "start_time" });

        migrationBuilder.CreateIndex(
            name: "IX_schedules_user_id_start_time_end_time",
            table: "schedules",
            columns: new[] { "user_id", "start_time", "end_time" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "idx_task_notes_task",
            table: "task_notes",
            column: "task_id");

        migrationBuilder.CreateIndex(
            name: "idx_tasks_assignee_status",
            table: "tasks",
            columns: new[] { "assignee_id", "status" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "import_jobs");

        migrationBuilder.DropTable(
            name: "task_notes");

        migrationBuilder.DropTable(
            name: "tasks");

        migrationBuilder.DropTable(
            name: "schedules");

        migrationBuilder.DropTable(
            name: "recurrences");
    }
}

