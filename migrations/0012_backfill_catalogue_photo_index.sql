-- Index the verified catalogue photo references already stored on restaurants.
--
-- The image files remain in R2; this migration only makes the existing
-- `/photos/...` references queryable as first-class records.  It deliberately
-- leaves `kind` as `unclassified`: no visual label is guessed from a filename.
-- The import pipeline may later replace these with evidence-backed metadata.
INSERT OR IGNORE INTO restaurant_photos (
  id,
  restaurant_id,
  r2_key,
  kind,
  dishes,
  vibe_tags,
  quality,
  source,
  created_at
)
SELECT
  r.id || ':catalogue:' || CAST(photo.key AS TEXT),
  r.id,
  substr(photo.value, 9),
  'unclassified',
  '[]',
  '[]',
  NULL,
  'catalogue-backfill',
  0
FROM restaurants AS r,
     json_each(CASE WHEN json_valid(r.photos) THEN r.photos ELSE '[]' END) AS photo
WHERE photo.type = 'text'
  AND photo.value LIKE '/photos/%';
