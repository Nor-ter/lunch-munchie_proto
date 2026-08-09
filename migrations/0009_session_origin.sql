-- A Lunchie room has one host-selected origin, so all participants vote from
-- exactly the same geographically constrained candidate pool. This is read
-- once at room creation, not continuous location tracking.
ALTER TABLE sessions ADD COLUMN origin_latitude REAL;
ALTER TABLE sessions ADD COLUMN origin_longitude REAL;
