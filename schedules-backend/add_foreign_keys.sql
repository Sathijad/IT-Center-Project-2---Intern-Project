-- Add foreign keys from Phase 4 tables to app_users
-- Run this script manually on your RDS database if migrations don't apply

-- schedules.user_id → app_users.id
ALTER TABLE schedules
DROP CONSTRAINT IF EXISTS fk_schedules_user_id;

ALTER TABLE schedules
ADD CONSTRAINT fk_schedules_user_id
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT;

-- schedules.created_by → app_users.id
ALTER TABLE schedules
DROP CONSTRAINT IF EXISTS fk_schedules_created_by;

ALTER TABLE schedules
ADD CONSTRAINT fk_schedules_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT;

-- tasks.assignee_id → app_users.id
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_assignee_id;

ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_assignee_id
    FOREIGN KEY (assignee_id) REFERENCES app_users(id) ON DELETE RESTRICT;

-- tasks.created_by → app_users.id
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_created_by;

ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT;

-- task_notes.author_id → app_users.id
ALTER TABLE task_notes
DROP CONSTRAINT IF EXISTS fk_task_notes_author_id;

ALTER TABLE task_notes
ADD CONSTRAINT fk_task_notes_author_id
    FOREIGN KEY (author_id) REFERENCES app_users(id) ON DELETE RESTRICT;

-- import_jobs.requested_by → app_users.id
ALTER TABLE import_jobs
DROP CONSTRAINT IF EXISTS fk_import_jobs_requested_by;

ALTER TABLE import_jobs
ADD CONSTRAINT fk_import_jobs_requested_by
    FOREIGN KEY (requested_by) REFERENCES app_users(id) ON DELETE RESTRICT;

