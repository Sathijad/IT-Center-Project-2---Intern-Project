
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);
START TRANSACTION;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE TABLE import_jobs (
        job_id uuid NOT NULL,
        job_type character varying(30) NOT NULL,
        requested_by bigint NOT NULL,
        file_path character varying(500) NOT NULL,
        status character varying(20) NOT NULL,
        error_details text,
        processed_count integer NOT NULL,
        failed_count integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        started_at timestamp with time zone,
        completed_at timestamp with time zone,
        CONSTRAINT "PK_import_jobs" PRIMARY KEY (job_id)
    );
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE TABLE recurrences (
        recurrence_id uuid NOT NULL,
        pattern character varying(30) NOT NULL,
        interval integer NOT NULL,
        by_day character varying(50),
        by_month_day character varying(50),
        until timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_recurrences" PRIMARY KEY (recurrence_id)
    );
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE TABLE schedules (
        schedule_id uuid NOT NULL,
        user_id bigint NOT NULL,
        team_id bigint,
        title character varying(120) NOT NULL,
        description text,
        start_time timestamp with time zone NOT NULL,
        end_time timestamp with time zone NOT NULL,
        is_all_day boolean NOT NULL,
        source character varying(30) NOT NULL,
        calendar_event_id character varying(255),
        status character varying(30) NOT NULL,
        "RecurrenceId" uuid,
        created_by bigint NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_schedules" PRIMARY KEY (schedule_id),
        CONSTRAINT "FK_schedules_recurrences_RecurrenceId" FOREIGN KEY ("RecurrenceId") 
REFERENCES recurrences (recurrence_id)
    );
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE TABLE tasks (
        task_id uuid NOT NULL,
        title character varying(160) NOT NULL,
        description text,
        assignee_id bigint NOT NULL,
        schedule_id uuid,
        priority character varying(20) NOT NULL,
        status character varying(20) NOT NULL,
        due_date timestamp with time zone,
        tags text[] NOT NULL,
        ms_graph_item_id character varying(255),
        created_by bigint NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_tasks" PRIMARY KEY (task_id),
        CONSTRAINT "FK_tasks_schedules_schedule_id" FOREIGN KEY (schedule_id) REFERENCES 
schedules (schedule_id)
    );
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE TABLE task_notes (
        note_id uuid NOT NULL,
        task_id uuid NOT NULL,
        author_id bigint NOT NULL,
        body text NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_task_notes" PRIMARY KEY (note_id),
        CONSTRAINT "FK_task_notes_tasks_task_id" FOREIGN KEY (task_id) REFERENCES tasks 
(task_id) ON DELETE CASCADE
    );
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    INSERT INTO recurrences (recurrence_id, by_day, by_month_day, created_at, interval, 
pattern, until)
    VALUES ('aaaaaaaa-bbbb-cccc-dddd-444444444444', 'MO,WE,FR', NULL, TIMESTAMPTZ 
'2025-01-01T00:00:00+00:00', 1, 'WEEKLY', NULL);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    INSERT INTO schedules (schedule_id, calendar_event_id, created_at, created_by, 
description, end_time, is_all_day, "RecurrenceId", source, start_time, status, team_id, 
title, updated_at, user_id)
    VALUES ('aaaaaaaa-bbbb-cccc-dddd-111111111111', NULL, TIMESTAMPTZ 
'2025-01-01T00:00:00+00:00', 1, 'Seeded schedule for QA validation', TIMESTAMPTZ 
'2025-01-06T17:00:00+00:00', FALSE, 'aaaaaaaa-bbbb-cccc-dddd-444444444444', 'Internal', 
TIMESTAMPTZ '2025-01-06T09:00:00+00:00', 'Confirmed', 10, 'Sample Onsite Shift', 
TIMESTAMPTZ '2025-01-01T00:00:00+00:00', 1);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    INSERT INTO tasks (task_id, assignee_id, created_at, created_by, description, 
due_date, ms_graph_item_id, priority, schedule_id, status, tags, title, updated_at)
    VALUES ('aaaaaaaa-bbbb-cccc-dddd-222222222222', 1, TIMESTAMPTZ 
'2025-01-01T00:00:00+00:00', 2, 'Initial seeded task for smoke testing', TIMESTAMPTZ 
'2025-01-07T17:00:00+00:00', NULL, 'High', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 
'InProgress', ARRAY['seed','demo']::text[], 'Seed Task', TIMESTAMPTZ 
'2025-01-01T00:00:00+00:00');
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    INSERT INTO task_notes (note_id, author_id, body, created_at, task_id, updated_at)
    VALUES ('aaaaaaaa-bbbb-cccc-dddd-333333333333', 2, 'Seeded comment for validation.', 
TIMESTAMPTZ '2025-01-01T00:00:00+00:00', 'aaaaaaaa-bbbb-cccc-dddd-222222222222', 
TIMESTAMPTZ '2025-01-01T00:00:00+00:00');
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX idx_import_jobs_status ON import_jobs (status);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX idx_schedules_user_start ON schedules (user_id, start_time);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX "IX_schedules_RecurrenceId" ON schedules ("RecurrenceId");
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE UNIQUE INDEX "IX_schedules_user_id_start_time_end_time" ON schedules 
(user_id, start_time, end_time);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX idx_task_notes_task ON task_notes (task_id);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX idx_tasks_assignee_status ON tasks (assignee_id, status);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    CREATE INDEX "IX_tasks_schedule_id" ON tasks (schedule_id);
    END IF;
END $EF$;
DO $EF$
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = 
'20251124152816_Phase4Initial') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20251124152816_Phase4Initial', '9.0.0');
    END IF;
END $EF$;
COMMIT;


