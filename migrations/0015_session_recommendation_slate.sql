-- A group session has one server-owned candidate deck.  Store the exact
-- recommendation evidence ID on the session so every participant can log
-- swipes against the same immutable slate rather than a synthetic client ID.
ALTER TABLE sessions ADD COLUMN recommendation_slate_id TEXT;

CREATE INDEX IF NOT EXISTS sessions_recommendation_slate_idx
  ON sessions(recommendation_slate_id);
