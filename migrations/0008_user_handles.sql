-- Public, user-editable identity used for profile search. OAuth subject IDs
-- remain internal ownership keys and are never exposed as public handles.
ALTER TABLE users ADD COLUMN handle TEXT;

-- rowid is unique inside this D1 table, so every existing account receives a
-- deterministic collision-free handle before the unique index is created.
UPDATE users
SET handle = 'user_' || printf('%08x', rowid)
WHERE handle IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_handle_unique_idx
ON users(handle COLLATE NOCASE)
WHERE handle IS NOT NULL;

