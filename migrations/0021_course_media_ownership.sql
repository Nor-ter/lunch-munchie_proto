-- Every feed image must have an explicit owner and provenance. The browser
-- never decides ownership: the API compares these fields with courses.author_id.
ALTER TABLE course_media ADD COLUMN owner_id TEXT;
ALTER TABLE course_media ADD COLUMN media_source TEXT NOT NULL DEFAULT 'legacy_import';

UPDATE course_media
SET owner_id = (SELECT author_id FROM courses WHERE courses.id = course_media.course_id)
WHERE owner_id IS NULL;

UPDATE course_media
SET media_source = 'author_upload'
WHERE r2_path LIKE '/photos/uploads/%';

CREATE INDEX IF NOT EXISTS course_media_owner_idx
ON course_media(course_id, owner_id, placement_index);

-- R2 deletion is not transactional with D1. Queue the author's unreferenced
-- objects in the same D1 batch that removes a post, then acknowledge each row
-- only after the bucket deletion succeeds.
CREATE TABLE IF NOT EXISTS r2_media_deletions (
  r2_path TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS r2_media_deletions_created_idx
ON r2_media_deletions(created_at);
