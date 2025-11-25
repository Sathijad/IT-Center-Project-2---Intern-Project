-- Phase 4 schedules & tasks schema (idempotent)
-- Creates schedules, tasks, task_notes, recurrences, and import_jobs tables in shared itcenter_auth database.
-- Does not drop Phase 1/2/3 tables.
-- Run this SQL directly on RDS using pgAdmin or AWS Query Editor before deploying Phase 4.
--
-- RELATIONSHIPS TO app_users TABLE:
--   - schedules.user_id references app_users.id (BIGINT)
--   - schedules.created_by references app_users.id (BIGINT)
--   - tasks.assignee_id references app_users.id (BIGINT)
--   - tasks.created_by references app_users.id (BIGINT)
--   - task_notes.author_id references app_users.id (BIGINT)
--   - import_jobs.requested_by references app_users.id (BIGINT)
-- Note: Following Phase 3 pattern, explicit FOREIGN KEY constraints are not added.
-- The application layer enforces referential integrity.

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recurrences table
CREATE TABLE IF NOT EXISTS recurrences (
    recurrence_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern           VARCHAR(30) NOT NULL,
    interval          INTEGER NOT NULL DEFAULT 1,
    by_day            VARCHAR(50),
    by_month_day      VARCHAR(50),
    until             TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE recurrences
    ADD COLUMN IF NOT EXISTS pattern           VARCHAR(30) NOT NULL DEFAULT 'DAILY',
    ADD COLUMN IF NOT EXISTS interval          INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS by_day            VARCHAR(50),
    ADD COLUMN IF NOT EXISTS by_month_day      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS until             TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Schedules table
-- user_id: References app_users.id (the user this schedule belongs to)
-- created_by: References app_users.id (the user who created this schedule)
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           BIGINT NOT NULL,  -- FK to app_users.id
    team_id           BIGINT,
    title             VARCHAR(120) NOT NULL,
    description       TEXT,
    start_time        TIMESTAMPTZ NOT NULL,
    end_time          TIMESTAMPTZ NOT NULL,
    is_all_day        BOOLEAN NOT NULL DEFAULT FALSE,
    source            VARCHAR(30) NOT NULL DEFAULT 'Internal',
    calendar_event_id VARCHAR(255),
    status            VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
    recurrence_id     UUID,
    created_by        BIGINT NOT NULL,  -- FK to app_users.id
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schedules_chk_times CHECK (end_time > start_time),
    CONSTRAINT schedules_chk_status CHECK (status IN ('Draft', 'Confirmed', 'Cancelled', 'Completed')),
    CONSTRAINT schedules_recurrence_fk FOREIGN KEY (recurrence_id) REFERENCES recurrences(recurrence_id) ON DELETE SET NULL
);

ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS user_id           BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS team_id           BIGINT,
    ADD COLUMN IF NOT EXISTS title             VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description       TEXT,
    ADD COLUMN IF NOT EXISTS start_time        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS end_time          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_all_day        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS source            VARCHAR(30) NOT NULL DEFAULT 'Internal',
    ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status            VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
    ADD COLUMN IF NOT EXISTS recurrence_id     UUID,
    ADD COLUMN IF NOT EXISTS created_by        BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Tasks table
-- assignee_id: References app_users.id (the user assigned to this task)
-- created_by: References app_users.id (the user who created this task)
CREATE TABLE IF NOT EXISTS tasks (
    task_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title              VARCHAR(160) NOT NULL,
    description        TEXT,
    assignee_id        BIGINT NOT NULL,  -- FK to app_users.id
    schedule_id        UUID,
    priority           VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status             VARCHAR(20) NOT NULL DEFAULT 'Pending',
    due_date           TIMESTAMPTZ,
    tags               TEXT[] NOT NULL DEFAULT '{}',
    ms_graph_item_id   VARCHAR(255),
    created_by          BIGINT NOT NULL,  -- FK to app_users.id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_chk_status CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Cancelled')),
    CONSTRAINT tasks_chk_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    CONSTRAINT tasks_schedule_fk FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE SET NULL
);

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS title              VARCHAR(160) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description        TEXT,
    ADD COLUMN IF NOT EXISTS assignee_id        BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS schedule_id        UUID,
    ADD COLUMN IF NOT EXISTS priority           VARCHAR(20) NOT NULL DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS status             VARCHAR(20) NOT NULL DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS due_date           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tags               TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS ms_graph_item_id   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by          BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Task notes table
-- author_id: References app_users.id (the user who wrote this note)
CREATE TABLE IF NOT EXISTS task_notes (
    note_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id           UUID NOT NULL,
    author_id         BIGINT NOT NULL,  -- FK to app_users.id
    body              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_notes_task_fk FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

ALTER TABLE task_notes
    ADD COLUMN IF NOT EXISTS task_id           UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS author_id         BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS body              TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Import jobs table
-- requested_by: References app_users.id (the user who requested the import)
CREATE TABLE IF NOT EXISTS import_jobs (
    job_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type          VARCHAR(30) NOT NULL DEFAULT 'SCHEDULES',
    requested_by      BIGINT NOT NULL,  -- FK to app_users.id
    file_path         VARCHAR(500) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    error_details     TEXT,
    processed_count   INTEGER NOT NULL DEFAULT 0,
    failed_count      INTEGER NOT NULL DEFAULT 0,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT import_jobs_chk_status CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

ALTER TABLE import_jobs
    ADD COLUMN IF NOT EXISTS job_type          VARCHAR(30) NOT NULL DEFAULT 'SCHEDULES',
    ADD COLUMN IF NOT EXISTS requested_by      BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS file_path         VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS status            VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    ADD COLUMN IF NOT EXISTS error_details     TEXT,
    ADD COLUMN IF NOT EXISTS processed_count   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_count      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS started_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_start ON schedules(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_recurrence ON schedules(recurrence_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_user_time_unique ON schedules(user_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_schedule ON tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_author ON task_notes(author_id);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_requested_by ON import_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Updated timestamp trigger function (reuse pattern from Phase 2/3)
CREATE OR REPLACE FUNCTION update_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedules_updated_at ON schedules;
CREATE TRIGGER trigger_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_schedules_timestamp();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_schedules_timestamp();

DROP TRIGGER IF EXISTS trigger_task_notes_updated_at ON task_notes;
CREATE TRIGGER trigger_task_notes_updated_at
    BEFORE UPDATE ON task_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_schedules_timestamp();

COMMIT;

-- Verification: Check that Phase 4 tables exist
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('schedules', 'tasks', 'task_notes', 'recurrences', 'import_jobs')
        )
        THEN 'SUCCESS: Phase 4 tables created in shared database'
        ELSE 'ERROR: Some Phase 4 tables are missing'
    END AS status;

-- Verification: Check that app_users table exists (required for Phase 4)
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'app_users'
        )
        THEN 'SUCCESS: app_users table exists - Phase 4 can connect to user data'
        ELSE 'ERROR: app_users table missing - Phase 4 requires this table from Phase 1'
    END AS app_users_status;

-- Verification: List all user reference columns in Phase 4 tables
SELECT 
    'Phase 4 User Reference Columns' AS info,
    'schedules.user_id -> app_users.id' AS relationship
UNION ALL
SELECT '', 'schedules.created_by -> app_users.id'
UNION ALL
SELECT '', 'tasks.assignee_id -> app_users.id'
UNION ALL
SELECT '', 'tasks.created_by -> app_users.id'
UNION ALL
SELECT '', 'task_notes.author_id -> app_users.id'
UNION ALL
SELECT '', 'import_jobs.requested_by -> app_users.id';

