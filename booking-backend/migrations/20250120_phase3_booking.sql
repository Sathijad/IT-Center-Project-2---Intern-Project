-- Phase 3 booking schema (idempotent)
-- Creates rooms, bookings, blackouts, and audit tables in shared itcenter_auth database.
-- Does not drop Phase 1/2 tables.

BEGIN;

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    capacity            INTEGER      NOT NULL CHECK (capacity > 0),
    amenities           JSONB        DEFAULT '[]'::jsonb,
    location            VARCHAR(255),
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    owner_team_id       BIGINT,
    external_calendar_id VARCHAR(255),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS name                VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS capacity            INTEGER      NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS amenities           JSONB        DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS location            VARCHAR(255),
    ADD COLUMN IF NOT EXISTS active              BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS owner_team_id       BIGINT,
    ADD COLUMN IF NOT EXISTS external_calendar_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Blackout windows table
CREATE TABLE IF NOT EXISTS blackout_windows (
    id                  BIGSERIAL PRIMARY KEY,
    room_id             BIGINT       NOT NULL,
    start_ts            TIMESTAMPTZ  NOT NULL,
    end_ts              TIMESTAMPTZ  NOT NULL,
    reason              TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT blackout_windows_chk_times CHECK (end_ts > start_ts),
    CONSTRAINT blackout_windows_room_fk FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

ALTER TABLE blackout_windows
    ADD COLUMN IF NOT EXISTS start_ts            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS end_ts              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reason              TEXT,
    ADD COLUMN IF NOT EXISTS created_by          BIGINT,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id                  BIGSERIAL PRIMARY KEY,
    room_id             BIGINT       NOT NULL,
    user_id             BIGINT       NOT NULL,
    start_ts            TIMESTAMPTZ  NOT NULL,
    end_ts              TIMESTAMPTZ  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'CONFIRMED',
    title               VARCHAR(255),
    attendees           JSONB        DEFAULT '[]'::jsonb,
    idempotency_key     VARCHAR(255),
    external_event_id   VARCHAR(255),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_chk_times CHECK (end_ts > start_ts),
    CONSTRAINT bookings_chk_status CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    CONSTRAINT bookings_room_fk FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS room_id             BIGINT       NOT NULL,
    ADD COLUMN IF NOT EXISTS user_id             BIGINT       NOT NULL,
    ADD COLUMN IF NOT EXISTS start_ts            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS end_ts              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status              VARCHAR(20)  NOT NULL DEFAULT 'CONFIRMED',
    ADD COLUMN IF NOT EXISTS title               VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attendees           JSONB        DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS idempotency_key     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS external_event_id   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Unique constraint on idempotency_key (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key 
    ON bookings(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Booking audit table
CREATE TABLE IF NOT EXISTS booking_audit (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT       NOT NULL,
    action              VARCHAR(50)  NOT NULL,
    actor_id            BIGINT,
    notes               TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_audit_booking_fk FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

ALTER TABLE booking_audit
    ADD COLUMN IF NOT EXISTS booking_id          BIGINT       NOT NULL,
    ADD COLUMN IF NOT EXISTS action              VARCHAR(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS actor_id            BIGINT,
    ADD COLUMN IF NOT EXISTS notes               TEXT,
    ADD COLUMN IF NOT EXISTS created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(active);
CREATE INDEX IF NOT EXISTS idx_rooms_team ON rooms(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_rooms_amenities ON rooms USING GIN(amenities);

CREATE INDEX IF NOT EXISTS idx_blackout_windows_room ON blackout_windows(room_id);
CREATE INDEX IF NOT EXISTS idx_blackout_windows_time ON blackout_windows(room_id, start_ts, end_ts);

-- Critical index for conflict detection (used with SELECT FOR UPDATE)
CREATE INDEX IF NOT EXISTS idx_bookings_conflict_check ON bookings(room_id, start_ts, end_ts) 
    WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS idx_bookings_external_event ON bookings(external_event_id) 
    WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_audit_booking ON booking_audit(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_audit_actor ON booking_audit(actor_id);

-- Updated timestamp trigger (reuse Phase 2 pattern)
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rooms_updated_at ON rooms;
CREATE TRIGGER trigger_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timestamp();

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timestamp();

COMMIT;

