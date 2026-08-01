-- Canonical, server-owned media model for Munchie posts.
-- `courses.hero_image` is metadata only; public feed artwork is exclusively
-- reconstructed from these original user-upload records.
CREATE TABLE IF NOT EXISTS course_media (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  r2_path TEXT NOT NULL,
  placement_index INTEGER NOT NULL CHECK(placement_index BETWEEN 0 AND 5),
  x REAL NOT NULL CHECK(x BETWEEN 0 AND 100),
  y REAL NOT NULL CHECK(y BETWEEN 0 AND 100),
  width REAL NOT NULL CHECK(width BETWEEN 5 AND 100),
  height REAL NOT NULL CHECK(height BETWEEN 5 AND 100),
  rotation REAL NOT NULL CHECK(rotation BETWEEN -180 AND 180),
  created_at INTEGER NOT NULL,
  UNIQUE(course_id, placement_index)
);
CREATE INDEX IF NOT EXISTS course_media_course_idx ON course_media(course_id, placement_index);

-- Backfill only already-saved user-media layouts. Empty legacy layouts do not
-- acquire a restaurant/hero-image substitute.
INSERT OR IGNORE INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at)
SELECT
  c.id || ':legacy:' || CAST(j.key AS TEXT),
  c.id,
  json_extract(j.value, '$.src'),
  CAST(j.key AS INTEGER),
  json_extract(j.value, '$.x'),
  json_extract(j.value, '$.y'),
  json_extract(j.value, '$.w'),
  COALESCE(json_extract(j.value, '$.h'), json_extract(j.value, '$.w')),
  json_extract(j.value, '$.rotate'),
  c.created_at
FROM courses c, json_each(c.feed_decor) j
WHERE json_valid(c.feed_decor)
  AND json_extract(j.value, '$.src') LIKE '/photos/%';
