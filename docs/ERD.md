# IT Center Auth - Entity Relationship Diagram

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                         app_users                            │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ cognito_sub      VARCHAR(255) UNIQUE NOT NULL                │
│ email            VARCHAR(255) UNIQUE NOT NULL                │
│ display_name     VARCHAR(50)                                 │
│ locale           VARCHAR(10) DEFAULT 'en'                    │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
│ updated_at       TIMESTAMP DEFAULT NOW()                     │
│ last_login       TIMESTAMP                                   │
│ is_active        BOOLEAN DEFAULT true                        │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                           │ (many-to-many)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      user_roles                         │
├─────────────────────────────────────────────────────────┤
│ id               BIGINT PK                              │
│ user_id          BIGINT FK → app_users.id               │
│ role_id          BIGINT FK → roles.id                   │
│ assigned_by      BIGINT FK → app_users.id               │
│ assigned_at      TIMESTAMP DEFAULT NOW()                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                          roles                               │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ name             VARCHAR(50) UNIQUE NOT NULL                 │
│ description      VARCHAR(255)                                │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       login_audit                            │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ user_id          BIGINT FK → app_users.id                   │
│ event_type       VARCHAR(50) NOT NULL                        │
│                  (LOGIN_SUCCESS, LOGIN_FAILURE,              │
│                   ROLE_ASSIGNED, ROLE_REMOVED,              │
│                   PROFILE_UPDATED)                          │
│ ip_address       VARCHAR(45)                                 │
│ user_agent       VARCHAR(500)                                │
│ metadata         JSONB                                       │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘
```

## Relationships

- `app_users` ↔ `user_roles` (many-to-many via join table)
- `user_roles` ↔ `roles` (many-to-one)
- `login_audit` → `app_users` (many-to-one, tracks user events)

## Phase 2 Schema Additions

```
┌─────────────────────────────────────────────────────────────┐
│                      leave_policies                            │
├─────────────────────────────────────────────────────────────┤
│ policy_id          BIGINT PK                                  │
│ name               VARCHAR(100) UNIQUE NOT NULL               │
│ description        VARCHAR(500)                                │
│ annual_limit       INTEGER NOT NULL                           │
│ carry_forward      INTEGER DEFAULT 0                          │
│ is_active          BOOLEAN DEFAULT true                       │
│ created_at         TIMESTAMP DEFAULT NOW()                    │
│ updated_at         TIMESTAMP DEFAULT NOW()                    │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                           │ (one-to-many)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    leave_requests                        │
├─────────────────────────────────────────────────────────┤
│ request_id          BIGINT PK                           │
│ user_id             BIGINT FK → app_users.id             │
│ policy_id           BIGINT FK → leave_policies.policy_id│
│ status              VARCHAR(20) DEFAULT 'PENDING'        │
│ start_date          DATE NOT NULL                        │
│ end_date            DATE NOT NULL                         │
│ reason              TEXT                                 │
│ created_at          TIMESTAMP DEFAULT NOW()               │
│ updated_at          TIMESTAMP DEFAULT NOW()               │
└─────────────────────────────────────────────────────────┘
                           │
                           │ (one-to-many)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      leave_audit                             │
├─────────────────────────────────────────────────────────────┤
│ audit_id            BIGINT PK                                │
│ request_id          BIGINT FK → leave_requests.request_id    │
│ action              VARCHAR(50) NOT NULL                     │
│ actor_id            BIGINT FK → app_users.id                  │
│ timestamp           TIMESTAMP DEFAULT NOW()                  │
│ notes               TEXT                                     │
│ metadata            JSONB                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    leave_balances                             │
├─────────────────────────────────────────────────────────────┤
│ balance_id          BIGINT PK                                │
│ user_id             BIGINT FK → app_users.id                 │
│ policy_id           BIGINT FK → leave_policies.policy_id      │
│ balance_days        DECIMAL(10,2) NOT NULL                    │
│ year                INTEGER NOT NULL                         │
│ updated_at          TIMESTAMP DEFAULT NOW()                  │
│ UNIQUE(user_id, policy_id, year)                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    attendance_logs                            │
├─────────────────────────────────────────────────────────────┤
│ log_id              BIGINT PK                                │
│ user_id             BIGINT FK → app_users.id                 │
│ clock_in            TIMESTAMP NOT NULL                       │
│ clock_out           TIMESTAMP                                 │
│ duration_minutes     INTEGER                                  │
│ geo_location        JSONB                                    │
│ created_at          TIMESTAMP DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘
```

## Phase 4 Schema Additions

```
┌─────────────────────────────────────────────────────────────┐
│                         schedules                           │
├─────────────────────────────────────────────────────────────┤
│ schedule_id       UUID PK                                   │
│ user_id           BIGINT FK → app_users.id                  │
│ team_id           BIGINT NULL                               │
│ title             VARCHAR(120) NOT NULL                     │
│ description       TEXT                                      │
│ start_time        TIMESTAMPTZ NOT NULL                      │
│ end_time          TIMESTAMPTZ NOT NULL                      │
│ recurrence_id     UUID FK → recurrences.recurrence_id NULL  │
│ is_all_day        BOOLEAN DEFAULT false                     │
│ source            VARCHAR(30) DEFAULT 'INTERNAL'            │
│ calendar_event_id VARCHAR(255) NULL                         │
│ status            VARCHAR(30) DEFAULT 'CONFIRMED'           │
│ created_by        BIGINT FK → app_users.id                  │
│ created_at        TIMESTAMPTZ DEFAULT NOW()                 │
│ updated_at        TIMESTAMPTZ DEFAULT NOW()                 │
│ UNIQUE(user_id, start_time, end_time)                       │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                           │ (one-to-many)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                       recurrences                      │
├────────────────────────────────────────────────────────┤
│ recurrence_id     UUID PK                              │
│ pattern           VARCHAR(30) NOT NULL                 │
│ interval          INTEGER DEFAULT 1                    │
│ by_day            VARCHAR(50) NULL                     │
│ by_month_day      VARCHAR(50) NULL                     │
│ until             TIMESTAMPTZ NULL                     │
│ created_at        TIMESTAMPTZ DEFAULT NOW()            │
└────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                           tasks                              │
├─────────────────────────────────────────────────────────────┤
│ task_id          UUID PK                                    │
│ title            VARCHAR(160) NOT NULL                      │
│ description      TEXT                                       │
│ assignee_id      BIGINT FK → app_users.id                   │
│ schedule_id      UUID FK → schedules.schedule_id NULL       │
│ priority         VARCHAR(20) DEFAULT 'MEDIUM'               │
│ status           VARCHAR(20) DEFAULT 'PENDING'              │
│ due_date         TIMESTAMPTZ NULL                           │
│ tags             TEXT[] DEFAULT '{}'                        │
│ ms_graph_item_id VARCHAR(255) NULL                          │
│ created_by       BIGINT FK → app_users.id                   │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
│ updated_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ (one-to-many)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         task_notes                           │
├─────────────────────────────────────────────────────────────┤
│ note_id          UUID PK                                    │
│ task_id          UUID FK → tasks.task_id                    │
│ author_id        BIGINT FK → app_users.id                   │
│ body             TEXT NOT NULL                              │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
│ updated_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        import_jobs                           │
├─────────────────────────────────────────────────────────────┤
│ job_id           UUID PK                                    │
│ job_type         VARCHAR(30) NOT NULL DEFAULT 'SCHEDULES'   │
│ requested_by     BIGINT FK → app_users.id                   │
│ file_path        VARCHAR(500) NOT NULL                      │
│ status           VARCHAR(20) DEFAULT 'QUEUED'               │
│ error_details    JSONB NULL                                 │
│ processed_count  INTEGER DEFAULT 0                          │
│ failed_count     INTEGER DEFAULT 0                          │
│ started_at       TIMESTAMPTZ NULL                           │
│ completed_at     TIMESTAMPTZ NULL                           │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘
```

## Phase 5 Schema Additions

```
┌─────────────────────────────────────────────────────────────┐
│                          events                             │
├─────────────────────────────────────────────────────────────┤
│ event_id        UUID PK                                     │
│ title           VARCHAR(180) NOT NULL                       │
│ summary         VARCHAR(500)                                │
│ status          VARCHAR(32) CHECK (enum)                    │
│ channel         VARCHAR(30) DEFAULT 'INTERNAL'              │
│ tags            TEXT[] DEFAULT '{}'                         │
│ attachments     JSONB                                      │
│ rsvp_required   BOOLEAN DEFAULT FALSE                       │
│ scheduled_for   TIMESTAMPTZ                                 │
│ published_at    TIMESTAMPTZ                                 │
│ broadcast_at    TIMESTAMPTZ                                 │
│ expires_at      TIMESTAMPTZ                                 │
│ created_by      BIGINT FK → app_users.id                    │
│ moderated_by    BIGINT FK → app_users.id                    │
│ moderated_at    TIMESTAMPTZ                                 │
│ etag            VARCHAR(64) NOT NULL                        │
│ created_at      TIMESTAMPTZ DEFAULT NOW()                   │
│ updated_at      TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  announcement_bodies                        │
├─────────────────────────────────────────────────────────────┤
│ body_id         UUID PK                                     │
│ event_id        UUID FK → events.event_id                   │
│ raw_html        TEXT NOT NULL                               │
│ sanitized_html  TEXT NOT NULL                               │
│ plain_text      TEXT NOT NULL                               │
│ created_at      TIMESTAMPTZ DEFAULT NOW()                   │
│ updated_at      TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         event_tags                          │
├─────────────────────────────────────────────────────────────┤
│ event_id        UUID FK → events.event_id                   │
│ tag             VARCHAR(50)                                 │
│ created_at      TIMESTAMPTZ DEFAULT NOW()                   │
│ PRIMARY KEY (event_id, tag)                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        tag_library                          │
├─────────────────────────────────────────────────────────────┤
│ tag_id          BIGSERIAL PK                                │
│ tag             VARCHAR(50) UNIQUE                          │
│ usage_count     INTEGER DEFAULT 0                           │
│ created_at      TIMESTAMPTZ DEFAULT NOW()                   │
│ updated_at      TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      publish_audit                          │
├─────────────────────────────────────────────────────────────┤
│ audit_id        BIGSERIAL PK                                │
│ event_id        UUID FK → events.event_id                   │
│ channel         VARCHAR(30)                                 │
│ status          VARCHAR(30)                                 │
│ message         TEXT                                        │
│ delivery_count  INTEGER DEFAULT 0                           │
│ error_details   TEXT                                        │
│ request_id      UUID                                        │
│ idempotency_key VARCHAR(64)                                 │
│ metadata        JSONB                                       │
│ created_at      TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      feature_flags                          │
├─────────────────────────────────────────────────────────────┤
│ flag_key        VARCHAR(100) PK                             │
│ flag_value      BOOLEAN DEFAULT FALSE                       │
│ description     TEXT                                        │
│ updated_at      TIMESTAMPTZ DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘
```

## Phase 7 Schema Additions (Feedback & Issue Reporting)

```
┌─────────────────────────────────────────────────────────────┐
│                         feedback                            │
├─────────────────────────────────────────────────────────────┤
│ feedback_id      UUID PK                                    │
│ title            VARCHAR(200) NOT NULL                     │
│ description      TEXT NOT NULL                             │
│ category         VARCHAR(50) NOT NULL                      │
│ priority         VARCHAR(20) DEFAULT 'MEDIUM'              │
│ status           VARCHAR(30) DEFAULT 'OPEN'               │
│ created_by       BIGINT NOT NULL → app_users.id            │
│ assigned_to      BIGINT → app_users.id                     │
│ labels           TEXT[] DEFAULT '{}'                       │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
│ updated_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    feedback_messages                        │
├─────────────────────────────────────────────────────────────┤
│ message_id        UUID PK                                   │
│ feedback_id      UUID FK → feedback.feedback_id            │
│ user_id          BIGINT NOT NULL → app_users.id            │
│ content          TEXT NOT NULL                             │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  feedback_attachments                       │
├─────────────────────────────────────────────────────────────┤
│ attachment_id    UUID PK                                   │
│ feedback_id      UUID FK → feedback.feedback_id            │
│ message_id       UUID FK → feedback_messages.message_id    │
│ s3_key           VARCHAR(500) NOT NULL                      │
│ file_name        VARCHAR(255) NOT NULL                     │
│ file_size        BIGINT                                     │
│ mime_type        VARCHAR(100)                              │
│ uploaded_by      BIGINT NOT NULL → app_users.id            │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      feedback_audit                         │
├─────────────────────────────────────────────────────────────┤
│ audit_id         BIGSERIAL PK                              │
│ feedback_id      UUID FK → feedback.feedback_id            │
│ user_id          BIGINT → app_users.id                     │
│ action           VARCHAR(50) NOT NULL                      │
│ old_value        JSONB                                     │
│ new_value        JSONB                                     │
│ metadata         JSONB                                     │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       nlp_analysis                          │
├─────────────────────────────────────────────────────────────┤
│ analysis_id      UUID PK                                   │
│ feedback_id      UUID FK → feedback.feedback_id            │
│ sentiment        VARCHAR(20)                               │
│ sentiment_score  JSONB                                     │
│ pii_entities     JSONB                                     │
│ raw_response     JSONB                                     │
│ analyzed_at      TIMESTAMPTZ DEFAULT NOW()                 │
│ created_at       TIMESTAMPTZ DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────┘
```

Relationships:
- `events.created_by` and `events.moderated_by` reference `app_users`.
- `announcement_bodies`, `event_tags`, and `publish_audit` all cascade on `events`.
- `tag_library` stores aggregated tag heuristics for ML/suggestion worker.
- `feature_flags` toggles (`events.push_enabled`, etc.) are consumed by the Go backend.
- `feedback.created_by` and `feedback.assigned_to` reference `app_users.id`.
- `feedback_messages`, `feedback_attachments`, `feedback_audit`, and `nlp_analysis` all reference `feedback.feedback_id`.
- `feedback_attachments` can optionally reference `feedback_messages.message_id` for message-specific attachments.

## Indexes

- `idx_users_email` on `app_users(email)`
- `idx_users_sub` on `app_users(cognito_sub)`
- `idx_audit_user_event` on `login_audit(user_id, event_type, created_at DESC)`
- `idx_user_roles_user` on `user_roles(user_id)`
- `idx_schedules_user_start` on `schedules(user_id, start_time)`
- `idx_tasks_assignee_status` on `tasks(assignee_id, status)`
- `idx_task_notes_task` on `task_notes(task_id)`
- `idx_import_jobs_status` on `import_jobs(status, created_at DESC)`
- `idx_feedback_created_by` on `feedback(created_by)`
- `idx_feedback_assigned_to` on `feedback(assigned_to)`
- `idx_feedback_status` on `feedback(status)`
- `idx_feedback_messages_feedback` on `feedback_messages(feedback_id)`
- `idx_feedback_attachments_feedback` on `feedback_attachments(feedback_id)`
- `idx_feedback_audit_feedback` on `feedback_audit(feedback_id)`
- `idx_nlp_analysis_feedback` on `nlp_analysis(feedback_id)`

## Data Retention

- `login_audit` records are retained for 180 days (configurable)
- Soft-deleted users maintain anonymized audit references

