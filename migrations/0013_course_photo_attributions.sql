-- A public post's uploaded photo may be attributed to one selected course stop
-- or explicitly classified as "other".  GPS only suggests; the author makes
-- the stored decision.  Exact GPS coordinates are intentionally not retained.
CREATE TABLE IF NOT EXISTS course_photo_attributions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  r2_path TEXT NOT NULL,
  restaurant_id TEXT,
  classification TEXT NOT NULL CHECK(classification IN ('restaurant', 'other')),
  attribution_source TEXT NOT NULL CHECK(attribution_source IN ('gps_suggestion', 'user_selected', 'other')),
  created_at INTEGER NOT NULL,
  UNIQUE(course_id, r2_path)
);
CREATE INDEX IF NOT EXISTS course_photo_attributions_course_idx ON course_photo_attributions(course_id);
CREATE INDEX IF NOT EXISTS course_photo_attributions_restaurant_idx ON course_photo_attributions(restaurant_id);
