-- Keep catalogue image review reversible: rejected media remains in R2 and can
-- be restored by an administrator, but presentation queries must exclude it.
ALTER TABLE restaurant_photos ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK(review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE restaurant_photos ADD COLUMN review_notes TEXT;
ALTER TABLE restaurant_photos ADD COLUMN reviewed_at INTEGER;
ALTER TABLE restaurant_photos ADD COLUMN reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS restaurant_photos_review_queue_idx
  ON restaurant_photos(review_status, restaurant_id, kind, quality DESC);
