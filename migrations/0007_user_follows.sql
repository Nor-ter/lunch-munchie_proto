-- Cloudflare D1 social graph. Replaces the retired hosted-auth RPCs.
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows(follower_id, created_at DESC);
