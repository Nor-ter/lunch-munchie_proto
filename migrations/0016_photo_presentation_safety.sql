-- Photo presentation metadata is evidence, not a visual guess at render time.
-- Unknown legacy images remain displayable only when already classified as a
-- food/table image; explicit people are never included in Lunchie cards.
ALTER TABLE restaurant_photos ADD COLUMN has_person INTEGER NOT NULL DEFAULT 0;
ALTER TABLE restaurant_photos ADD COLUMN perceptual_hash TEXT;
CREATE INDEX IF NOT EXISTS restaurant_photos_safe_presentation_idx
  ON restaurant_photos(restaurant_id, kind, has_person, quality DESC);
