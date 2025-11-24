using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedules.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase4Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "import_jobs",
                columns: table => new
                {
                    JobId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    JobType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    SuccessRows = table.Column<int>(type: "integer", nullable: false),
                    FailureRows = table.Column<int>(type: "integer", nullable: false),
                    ErrorDetails = table.Column<string>(type: "jsonb", nullable: true),
                    InitiatedBy = table.Column<long>(type: "bigint", nullable: false),
                    StorageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_jobs", x => x.JobId);
                });

            migrationBuilder.CreateTable(
                name: "recurrences",
                columns: table => new
                {
                    RecurrenceId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Pattern = table.Column<string>(type: "text", nullable: false),
                    Interval = table.Column<short>(type: "smallint", nullable: false),
                    ByDay = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BySetPosition = table.Column<short>(type: "smallint", nullable: true),
                    RepeatUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Timezone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recurrences", x => x.RecurrenceId);
                });

            migrationBuilder.CreateTable(
                name: "schedules",
                columns: table => new
                {
                    ScheduleId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    TeamId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RecurrenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Metadata = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedules", x => x.ScheduleId);
                    table.ForeignKey(
                        name: "FK_schedules_recurrences_RecurrenceId",
                        column: x => x.RecurrenceId,
                        principalTable: "recurrences",
                        principalColumn: "RecurrenceId");
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                columns: table => new
                {
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AssigneeId = table.Column<long>(type: "bigint", nullable: false),
                    ReporterId = table.Column<long>(type: "bigint", nullable: false),
                    ScheduleId = table.Column<Guid>(type: "uuid", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => x.TaskId);
                    table.ForeignKey(
                        name: "FK_tasks_schedules_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "schedules",
                        principalColumn: "ScheduleId");
                });

            migrationBuilder.CreateTable(
                name: "task_notes",
                columns: table => new
                {
                    NoteId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    Attachments = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_notes", x => x.NoteId);
                    table.ForeignKey(
                        name: "FK_task_notes_tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "tasks",
                        principalColumn: "TaskId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_import_jobs_status",
                table: "import_jobs",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "idx_schedules_team_start",
                table: "schedules",
                columns: new[] { "TeamId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "idx_schedules_user_start",
                table: "schedules",
                columns: new[] { "UserId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_schedules_RecurrenceId",
                table: "schedules",
                column: "RecurrenceId");

            migrationBuilder.CreateIndex(
                name: "idx_task_notes_task",
                table: "task_notes",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "idx_tasks_assignee_status",
                table: "tasks",
                columns: new[] { "AssigneeId", "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_tasks_ScheduleId",
                table: "tasks",
                column: "ScheduleId");
        }

        /// <inheritdoc />
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
}
