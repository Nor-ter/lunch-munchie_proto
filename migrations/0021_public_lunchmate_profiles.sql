-- Public Lunchmate presentation only. Inventory, rewards, XP and claims stay
-- client-private and are intentionally excluded from this D1 contract.
ALTER TABLE users ADD COLUMN foodie_char TEXT;
ALTER TABLE users ADD COLUMN foodie_skin TEXT;
ALTER TABLE users ADD COLUMN lunchmate_loadout TEXT;
ALTER TABLE users ADD COLUMN lunchmate_room_loadout TEXT;
ALTER TABLE users ADD COLUMN lunchmate_visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (lunchmate_visibility IN ('public', 'private'));
