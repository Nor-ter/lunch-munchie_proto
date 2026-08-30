-- Persist the author's per-photo feed story as bounded JSON. course_media
-- remains the ownership/provenance ledger for every referenced photo path.
ALTER TABLE courses ADD COLUMN feed_story TEXT NOT NULL DEFAULT '[]';
