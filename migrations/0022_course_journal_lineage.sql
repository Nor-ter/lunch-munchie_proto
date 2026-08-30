-- A published visit journal may start from a previously saved reusable course.
-- Keep the source relationship and the restaurant snapshot used at publish time
-- so later catalogue edits cannot rewrite the author's historical record.
ALTER TABLE courses ADD COLUMN source_course_id TEXT;
ALTER TABLE courses ADD COLUMN source_stops_snapshot TEXT NOT NULL DEFAULT '[]';

-- Browser/network retries must resolve to one published journal per author and
-- request key instead of creating duplicate courses and duplicate rewards.
ALTER TABLE courses ADD COLUMN publish_idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS courses_source_course_idx
ON courses(source_course_id);

CREATE UNIQUE INDEX IF NOT EXISTS courses_publish_idempotency_idx
ON courses(author_id, publish_idempotency_key)
WHERE publish_idempotency_key IS NOT NULL;
