-- Phase 7 Feedback & Issue Reporting schema (idempotent)
-- Creates feedback, feedback_messages, feedback_attachments, feedback_audit, and nlp_analysis tables in shared itcenter_auth database.
-- Does not drop Phase 1/2/3/4/5/6 tables.
-- Run this SQL directly on RDS using pgAdmin or AWS Query Editor before deploying Phase 7.
--
-- RELATIONSHIPS TO app_users TABLE:
--   - feedback.created_by references app_users.id (BIGINT)
--   - feedback.assigned_to references app_users.id (BIGINT)
--   - feedback_messages.user_id references app_users.id (BIGINT)
--   - feedback_attachments.uploaded_by references app_users.id (BIGINT)
--   - feedback_audit.user_id references app_users.id (BIGINT)
-- Note: Following Phase 4/6 pattern, explicit FOREIGN KEY constraints are not added.
-- The application layer enforces referential integrity.

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feedback table: main feedback/issue records
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    category            VARCHAR(50) NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_by          BIGINT NOT NULL,  -- FK to app_users.id
    assigned_to         BIGINT,           -- FK to app_users.id
    labels              TEXT[] NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_priority_chk CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT feedback_status_chk CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'))
);

ALTER TABLE feedback
    ADD COLUMN IF NOT EXISTS title               VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description         TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS category            VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS status              VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    ADD COLUMN IF NOT EXISTS created_by          BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS assigned_to        BIGINT,
    ADD COLUMN IF NOT EXISTS labels              TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Feedback Messages table: comments/thread messages
CREATE TABLE IF NOT EXISTS feedback_messages (
    message_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id         UUID NOT NULL,
    user_id             BIGINT NOT NULL,  -- FK to app_users.id
    content             TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_messages_feedback_fk FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id) ON DELETE CASCADE
);

ALTER TABLE feedback_messages
    ADD COLUMN IF NOT EXISTS feedback_id         UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS user_id             BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS content             TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Feedback Attachments table: file attachments (S3 references)
CREATE TABLE IF NOT EXISTS feedback_attachments (
    attachment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id         UUID NOT NULL,
    message_id          UUID,
    s3_key              VARCHAR(500) NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_size           BIGINT,
    mime_type           VARCHAR(100),
    uploaded_by         BIGINT NOT NULL,  -- FK to app_users.id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_attachments_feedback_fk FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id) ON DELETE CASCADE,
    CONSTRAINT feedback_attachments_message_fk FOREIGN KEY (message_id) REFERENCES feedback_messages(message_id) ON DELETE CASCADE
);

ALTER TABLE feedback_attachments
    ADD COLUMN IF NOT EXISTS feedback_id         UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS message_id          UUID,
    ADD COLUMN IF NOT EXISTS s3_key              VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_name           VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_size           BIGINT,
    ADD COLUMN IF NOT EXISTS mime_type           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uploaded_by         BIGINT NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Feedback Audit table: workflow history tracking
CREATE TABLE IF NOT EXISTS feedback_audit (
    audit_id            BIGSERIAL PRIMARY KEY,
    feedback_id         UUID NOT NULL,
    user_id             BIGINT,  -- FK to app_users.id
    action              VARCHAR(50) NOT NULL,
    old_value           JSONB,
    new_value           JSONB,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_audit_feedback_fk FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id) ON DELETE CASCADE
);

ALTER TABLE feedback_audit
    ADD COLUMN IF NOT EXISTS feedback_id         UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS user_id             BIGINT,
    ADD COLUMN IF NOT EXISTS action              VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS old_value           JSONB,
    ADD COLUMN IF NOT EXISTS new_value           JSONB,
    ADD COLUMN IF NOT EXISTS metadata            JSONB,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- NLP Analysis table: AWS Comprehend results
CREATE TABLE IF NOT EXISTS nlp_analysis (
    analysis_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id         UUID NOT NULL,
    sentiment           VARCHAR(20),
    sentiment_score     JSONB,
    pii_entities        JSONB,
    raw_response        JSONB,
    analyzed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT nlp_analysis_feedback_fk FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id) ON DELETE CASCADE,
    CONSTRAINT nlp_analysis_sentiment_chk CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'))
);

ALTER TABLE nlp_analysis
    ADD COLUMN IF NOT EXISTS feedback_id         UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS sentiment           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sentiment_score     JSONB,
    ADD COLUMN IF NOT EXISTS pii_entities        JSONB,
    ADD COLUMN IF NOT EXISTS raw_response        JSONB,
    ADD COLUMN IF NOT EXISTS analyzed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_created_by ON feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_assigned_to ON feedback(assigned_to);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_feedback ON feedback_messages(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_messages_user ON feedback_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_messages_created_at ON feedback_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback ON feedback_attachments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_message ON feedback_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_uploaded_by ON feedback_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_feedback_audit_feedback ON feedback_audit(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_audit_user ON feedback_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_audit_created_at ON feedback_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nlp_analysis_feedback ON nlp_analysis(feedback_id);
CREATE INDEX IF NOT EXISTS idx_nlp_analysis_analyzed_at ON nlp_analysis(analyzed_at DESC);

-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION trg_set_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trg_feedback_update ON feedback;
CREATE TRIGGER trg_feedback_update
    BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_timestamp();

COMMIT;

