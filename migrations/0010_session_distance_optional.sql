-- Location is optional. A room only uses the host-selected origin and radius
-- when the host explicitly enables the distance filter.
ALTER TABLE sessions ADD COLUMN distance_enabled INTEGER NOT NULL DEFAULT 1;
