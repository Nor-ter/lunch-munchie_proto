-- Each participant contributes an explicit, bounded preference snapshot before
-- a shared Lunchie vote begins. It is session data, not a cross-session profile
-- store, so a guest can participate without an account.
ALTER TABLE session_members ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '[]';
