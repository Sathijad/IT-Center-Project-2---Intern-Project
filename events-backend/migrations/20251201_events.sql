-- Phase 5 Events & Announcements schema
-- Safe for repeated execution (idempotent) on shared itcenter_auth DB.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS events (
    event_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               VARCHAR(180) NOT NULL,
    summary             VARCHAR(500),
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING_MODERATION',
    channel             VARCHAR(30) NOT NULL DEFAULT 'INTERNAL',
    tags                TEXT[] NOT NULL DEFAULT '{}',
    attachments         JSONB,
    rsvp_required       BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for       TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_by          BIGINT NOT NULL REFERENCES app_users(id),
    moderated_by        BIGINT REFERENCES app_users(id),
    moderated_at        TIMESTAMPTZ,
    broadcast_at        TIMESTAMPTZ,
    etag                VARCHAR(64) NOT NULL DEFAULT md5(random()::text),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT events_status_chk CHECK (status IN (
        'DRAFT','PENDING_MODERATION','SCHEDULED','APPROVED','REJECTED','PUBLISHED','ARCHIVED'
    ))
);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS summary VARCHAR(500),
    ADD COLUMN IF NOT EXISTS attachments JSONB,
    ADD COLUMN IF NOT EXISTS broadcast_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS etag VARCHAR(64) NOT NULL DEFAULT md5(random()::text);

CREATE TABLE IF NOT EXISTS announcement_bodies (
    body_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    raw_html        TEXT NOT NULL,
    sanitized_html  TEXT NOT NULL,
    plain_text      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_bodies_event
    ON announcement_bodies(event_id);

CREATE TABLE IF NOT EXISTS event_tags (
    event_id    UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    tag         VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, tag)
);

CREATE TABLE IF NOT EXISTS tag_library (
    tag_id      BIGSERIAL PRIMARY KEY,
    tag         VARCHAR(50) NOT NULL UNIQUE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publish_audit (
    audit_id        BIGSERIAL PRIMARY KEY,
    event_id        UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    channel         VARCHAR(30) NOT NULL,
    status          VARCHAR(30) NOT NULL,
    message         TEXT,
    delivery_count  INTEGER NOT NULL DEFAULT 0,
    error_details   TEXT,
    request_id      UUID NOT NULL DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(64) NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_audit_event ON publish_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_publish_audit_key ON publish_audit(idempotency_key);

CREATE OR REPLACE FUNCTION trg_set_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_update
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_timestamp();

CREATE TRIGGER trg_announcements_update
    BEFORE UPDATE ON announcement_bodies
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_timestamp();

-- optional feature flag table
CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key    VARCHAR(100) PRIMARY KEY,
    flag_value  BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags(flag_key, flag_value, description)
VALUES
    ('events.push_enabled', TRUE, 'Enable push notifications for events'),
    ('events.email_enabled', TRUE, 'Enable SES fan-out'),
    ('events.teams_enabled', TRUE, 'Enable Teams announcements')
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO tag_library(tag, usage_count)
VALUES
    ('general', 1),
    ('policy', 1),
    ('security', 1),
    ('holiday', 1)
ON CONFLICT (tag) DO NOTHING;

COMMIT;

