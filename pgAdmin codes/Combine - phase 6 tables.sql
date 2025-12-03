-- Phase 6 Performance & Training schema (idempotent)
-- Creates kpis, kpi_targets, kpi_actuals, training_courses, training_assignments, training_notes, and import_jobs tables in shared itcenter_auth database.
-- Does not drop Phase 1/2/3/4/5 tables.
-- Run this SQL directly on RDS using pgAdmin or AWS Query Editor before deploying Phase 6.
--
-- RELATIONSHIPS TO app_users TABLE:
--   - kpi_targets.user_id references app_users.id (BIGINT)
--   - kpi_targets.created_by references app_users.id (BIGINT)
--   - kpi_actuals.user_id references app_users.id (BIGINT)
--   - training_assignments.assignee_id references app_users.id (BIGINT)
--   - training_assignments.assigned_by references app_users.id (BIGINT)
--   - training_notes.author_id references app_users.id (BIGINT)
--   - import_jobs.requested_by references app_users.id (BIGINT)
-- Note: Following Phase 4 pattern, explicit FOREIGN KEY constraints are not added.
-- The application layer enforces referential integrity.

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- KPIs table: master list of KPI definitions
CREATE TABLE IF NOT EXISTS kpis (
    kpi_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code              VARCHAR(50) NOT NULL UNIQUE,
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    unit              VARCHAR(50),
    category          VARCHAR(100),
    calculation_hint  TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE kpis
    ADD COLUMN IF NOT EXISTS code              VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS name              VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description       TEXT,
    ADD COLUMN IF NOT EXISTS unit              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS category          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS calculation_hint  TEXT,
    ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- KPI Targets table: per-user/team/period targets
-- user_id: References app_users.id (the user this target is for)
-- created_by: References app_users.id (the user who created this target)
CREATE TABLE IF NOT EXISTS kpi_targets (
    target_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id            UUID NOT NULL,
    user_id           BIGINT,
    team_id           BIGINT,
    period_type       VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    period_start      DATE NOT NULL,
    period_end        DATE NOT NULL,
    target_value      DECIMAL(18, 4) NOT NULL,
    created_by        BIGINT NOT NULL,  -- FK to app_users.id
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kpi_targets_chk_period CHECK (period_end >= period_start),
    CONSTRAINT kpi_targets_chk_period_type CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    CONSTRAINT kpi_targets_kpi_fk FOREIGN KEY (kpi_id) REFERENCES kpis(kpi_id) ON DELETE CASCADE
);

ALTER TABLE kpi_targets
    ADD COLUMN IF NOT EXISTS kpi_id            UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS user_id           BIGINT,
    ADD COLUMN IF NOT EXISTS team_id           BIGINT,
    ADD COLUMN IF NOT EXISTS period_type       VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS period_start      DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS period_end        DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS target_value      DECIMAL(18, 4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by        BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- KPI Actuals table: measured values over time
-- user_id: References app_users.id (the user this actual is for)
CREATE TABLE IF NOT EXISTS kpi_actuals (
    actual_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id            UUID NOT NULL,
    user_id           BIGINT,
    team_id           BIGINT,
    measured_at       TIMESTAMPTZ NOT NULL,
    period_start      DATE,
    period_end        DATE,
    value             DECIMAL(18, 4) NOT NULL,
    source_type       VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    import_job_id     UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kpi_actuals_chk_source_type CHECK (source_type IN ('MANUAL', 'IMPORT', 'SYSTEM', 'API')),
    CONSTRAINT kpi_actuals_kpi_fk FOREIGN KEY (kpi_id) REFERENCES kpis(kpi_id) ON DELETE CASCADE
);

ALTER TABLE kpi_actuals
    ADD COLUMN IF NOT EXISTS kpi_id            UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS user_id           BIGINT,
    ADD COLUMN IF NOT EXISTS team_id           BIGINT,
    ADD COLUMN IF NOT EXISTS measured_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS period_start      DATE,
    ADD COLUMN IF NOT EXISTS period_end        DATE,
    ADD COLUMN IF NOT EXISTS value             DECIMAL(18, 4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source_type       VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS import_job_id     UUID,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Training Courses table: catalog of courses
CREATE TABLE IF NOT EXISTS training_courses (
    course_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             VARCHAR(300) NOT NULL,
    description       TEXT,
    provider          VARCHAR(200),
    modality          VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
    teams_meeting_url TEXT,
    sharepoint_url    TEXT,
    onedrive_url      TEXT,
    duration_minutes  INTEGER,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT training_courses_chk_modality CHECK (modality IN ('ONLINE', 'IN_PERSON', 'HYBRID', 'SELF_PACED'))
);

ALTER TABLE training_courses
    ADD COLUMN IF NOT EXISTS title             VARCHAR(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description       TEXT,
    ADD COLUMN IF NOT EXISTS provider          VARCHAR(200),
    ADD COLUMN IF NOT EXISTS modality          VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN IF NOT EXISTS teams_meeting_url TEXT,
    ADD COLUMN IF NOT EXISTS sharepoint_url    TEXT,
    ADD COLUMN IF NOT EXISTS onedrive_url      TEXT,
    ADD COLUMN IF NOT EXISTS duration_minutes  INTEGER,
    ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Training Assignments table: links users/groups/cohorts to courses
-- assignee_id: References app_users.id (the user assigned to this training)
-- assigned_by: References app_users.id (the user who assigned this training)
CREATE TABLE IF NOT EXISTS training_assignments (
    assignment_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id         UUID NOT NULL,
    assignee_type     VARCHAR(30) NOT NULL DEFAULT 'USER',
    assignee_id       BIGINT,
    cohort_id         VARCHAR(100),
    due_date          TIMESTAMPTZ,
    status            VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    progress          INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completed_at      TIMESTAMPTZ,
    assigned_by       BIGINT NOT NULL,  -- FK to app_users.id
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT training_assignments_chk_assignee_type CHECK (assignee_type IN ('USER', 'TEAM', 'COHORT')),
    CONSTRAINT training_assignments_chk_status CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT training_assignments_course_fk FOREIGN KEY (course_id) REFERENCES training_courses(course_id) ON DELETE CASCADE
);

ALTER TABLE training_assignments
    ADD COLUMN IF NOT EXISTS course_id         UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS assignee_type     VARCHAR(30) NOT NULL DEFAULT 'USER',
    ADD COLUMN IF NOT EXISTS assignee_id       BIGINT,
    ADD COLUMN IF NOT EXISTS cohort_id         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS due_date          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status            VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    ADD COLUMN IF NOT EXISTS progress          INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS assigned_by       BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Training Notes table: free-form notes/feedback per assignment
-- author_id: References app_users.id (the user who wrote this note)
CREATE TABLE IF NOT EXISTS training_notes (
    note_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id    UUID NOT NULL,
    author_id         BIGINT NOT NULL,  -- FK to app_users.id
    note_type         VARCHAR(30) NOT NULL DEFAULT 'NOTE',
    content           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT training_notes_chk_note_type CHECK (note_type IN ('NOTE', 'FEEDBACK', 'QUESTION', 'RESOLUTION')),
    CONSTRAINT training_notes_assignment_fk FOREIGN KEY (assignment_id) REFERENCES training_assignments(assignment_id) ON DELETE CASCADE
);

ALTER TABLE training_notes
    ADD COLUMN IF NOT EXISTS assignment_id    UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS author_id         BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS note_type         VARCHAR(30) NOT NULL DEFAULT 'NOTE',
    ADD COLUMN IF NOT EXISTS content           TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Import Jobs table (reuse pattern from Phase 4, but extend for KPI imports)
-- requested_by: References app_users.id (the user who requested the import)
CREATE TABLE IF NOT EXISTS import_jobs (
    job_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type          VARCHAR(30) NOT NULL DEFAULT 'KPI_ACTUALS',
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
    ADD COLUMN IF NOT EXISTS job_type          VARCHAR(30) NOT NULL DEFAULT 'KPI_ACTUALS',
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpis_code ON kpis(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_kpi ON kpi_targets(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_user ON kpi_targets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_team ON kpi_targets(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_period ON kpi_targets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_actuals_kpi ON kpi_actuals(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_user ON kpi_actuals(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_team ON kpi_actuals(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_measured_at ON kpi_actuals(measured_at);
CREATE INDEX IF NOT EXISTS idx_kpi_actuals_import_job ON kpi_actuals(import_job_id) WHERE import_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_courses_active ON training_courses(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_training_assignments_course ON training_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_assignee ON training_assignments(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_due_date ON training_assignments(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_notes_assignment ON training_notes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_training_notes_author ON training_notes(author_id);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_requested_by ON import_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Updated timestamp trigger function (reuse pattern from Phase 4)
CREATE OR REPLACE FUNCTION update_performance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kpis_updated_at ON kpis;
CREATE TRIGGER trigger_kpis_updated_at
    BEFORE UPDATE ON kpis
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_timestamp();

DROP TRIGGER IF EXISTS trigger_kpi_targets_updated_at ON kpi_targets;
CREATE TRIGGER trigger_kpi_targets_updated_at
    BEFORE UPDATE ON kpi_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_timestamp();

DROP TRIGGER IF EXISTS trigger_training_courses_updated_at ON training_courses;
CREATE TRIGGER trigger_training_courses_updated_at
    BEFORE UPDATE ON training_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_timestamp();

DROP TRIGGER IF EXISTS trigger_training_assignments_updated_at ON training_assignments;
CREATE TRIGGER trigger_training_assignments_updated_at
    BEFORE UPDATE ON training_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_timestamp();

DROP TRIGGER IF EXISTS trigger_training_notes_updated_at ON training_notes;
CREATE TRIGGER trigger_training_notes_updated_at
    BEFORE UPDATE ON training_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_timestamp();

COMMIT;










-- Verification: Check that Phase 6 tables exist
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('kpis', 'kpi_targets', 'kpi_actuals', 'training_courses', 'training_assignments', 'training_notes', 'import_jobs')
        )
        THEN 'SUCCESS: Phase 6 tables created in shared database'
        ELSE 'ERROR: Some Phase 6 tables are missing'
    END AS status;

-- Verification: Check that app_users table exists (required for Phase 6)
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'app_users'
        )
        THEN 'SUCCESS: app_users table exists - Phase 6 can connect to user data'
        ELSE 'ERROR: app_users table missing - Phase 6 requires this table from Phase 1'
    END AS app_users_status;










-- Verification: List all user reference columns in Phase 6 tables
SELECT 
    'Phase 6 User Reference Columns' AS info,
    'kpi_targets.user_id -> app_users.id' AS relationship
UNION ALL
SELECT '', 'kpi_targets.created_by -> app_users.id'
UNION ALL
SELECT '', 'kpi_actuals.user_id -> app_users.id'
UNION ALL
SELECT '', 'training_assignments.assignee_id -> app_users.id'
UNION ALL
SELECT '', 'training_assignments.assigned_by -> app_users.id'
UNION ALL
SELECT '', 'training_notes.author_id -> app_users.id'
UNION ALL
SELECT '', 'import_jobs.requested_by -> app_users.id';

