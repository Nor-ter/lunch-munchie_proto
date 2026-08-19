-- A session member receives this secret once when creating or joining a room.
-- Mutating lifecycle endpoints verify its SHA-256 hash, so a public user_id
-- cannot be replayed to impersonate the host or another participant.
ALTER TABLE session_members ADD COLUMN member_secret_hash TEXT;
