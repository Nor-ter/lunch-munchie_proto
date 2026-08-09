-- A recommendation is evidence, not merely a response payload.  Keep the
-- exact ordered slate that the server served so later events can be attributed
-- to a real policy, context and inclusion propensity.
CREATE TABLE IF NOT EXISTS recommendation_slates (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  session_id TEXT,
  slate_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  variant TEXT,
  context_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  candidate_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS recommendation_slates_owner_time_idx
  ON recommendation_slates(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_slates_session_time_idx
  ON recommendation_slates(session_id, created_at DESC);
