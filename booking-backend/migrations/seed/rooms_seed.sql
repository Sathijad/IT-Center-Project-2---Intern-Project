-- Seed data for sample rooms
-- This can be run multiple times safely (idempotent)

BEGIN;

-- Insert sample rooms if they don't exist
INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Conference Room A', 20, '["projector", "whiteboard", "video-conference"]'::jsonb, 'Building 1, Floor 2', TRUE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Conference Room B', 15, '["projector", "whiteboard"]'::jsonb, 'Building 1, Floor 2', TRUE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Meeting Room 101', 8, '["whiteboard", "video-conference"]'::jsonb, 'Building 1, Floor 1', TRUE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Meeting Room 102', 6, '["whiteboard"]'::jsonb, 'Building 1, Floor 1', TRUE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Training Room', 30, '["projector", "whiteboard", "video-conference", "recording"]'::jsonb, 'Building 2, Floor 1', TRUE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO rooms (name, capacity, amenities, location, active, owner_team_id)
VALUES
    ('Quiet Room', 4, '[]'::jsonb, 'Building 1, Floor 3', TRUE, NULL)
ON CONFLICT DO NOTHING;

COMMIT;

