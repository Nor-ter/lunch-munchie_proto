-- 공개 피드의 기본 사회적 상호작용. 모든 작성/신고 API는 서버 세션을 검증한다.
CREATE TABLE IF NOT EXISTS feed_comments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_emoji TEXT NOT NULL DEFAULT '🐳',
  parent_id TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS feed_comments_course_idx ON feed_comments(course_id, created_at);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(reporter_id, target_type, target_id)
);
