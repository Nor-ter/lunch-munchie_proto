-- Bind an idempotency key to the exact publication payload. Reusing a key for
-- different content is rejected by the API instead of returning an old post.
ALTER TABLE courses ADD COLUMN publish_payload_hash TEXT;

-- Repair overly broad legacy classification from the additive ownership
-- migration. Only an author's own upload prefix is an author upload.
UPDATE course_media
SET media_source = 'legacy_import'
WHERE media_source = 'author_upload'
  AND (
    owner_id IS NULL
    OR r2_path NOT LIKE '/photos/uploads/' || owner_id || '/%'
  );

-- SQLite cannot add a NOT NULL constraint in place without rebuilding a live
-- table. Guard every new write/update while leaving any orphan legacy row
-- quarantined for explicit review rather than deleting operating data.
CREATE TRIGGER IF NOT EXISTS course_media_owner_insert_guard
BEFORE INSERT ON course_media
WHEN NEW.owner_id IS NULL
  OR trim(NEW.owner_id) = ''
  OR NOT EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = NEW.course_id
      AND courses.author_id = NEW.owner_id
  )
  OR (
    NEW.media_source = 'author_upload'
    AND NEW.r2_path NOT LIKE '/photos/uploads/' || NEW.owner_id || '/%'
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid course media owner');
END;

CREATE TRIGGER IF NOT EXISTS course_media_owner_update_guard
BEFORE UPDATE OF owner_id, media_source, r2_path ON course_media
WHEN NEW.owner_id IS NULL
  OR trim(NEW.owner_id) = ''
  OR NOT EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = NEW.course_id
      AND courses.author_id = NEW.owner_id
  )
  OR (
    NEW.media_source = 'author_upload'
    AND NEW.r2_path NOT LIKE '/photos/uploads/' || NEW.owner_id || '/%'
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid course media owner');
END;
