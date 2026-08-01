-- Lunchie Munchie D1 canonical schema.
-- JSON is stored as TEXT; timestamps are Unix milliseconds.  This mirrors the
-- application contract without pretending that unverified catalogue data exists.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  profile_image_url TEXT,
  bio TEXT,
  location TEXT,
  dietary_preferences TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  address TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  price_level INTEGER NOT NULL DEFAULT 2 CHECK(price_level BETWEEN 1 AND 4),
  short_description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  dietary_options TEXT NOT NULL DEFAULT '[]',
  photos TEXT NOT NULL DEFAULT '[]',
  menus TEXT NOT NULL DEFAULT '[]',
  vibe_tags TEXT NOT NULL DEFAULT '[]',
  visual_description TEXT,
  phone_number TEXT,
  business_hours TEXT,
  website TEXT,
  google_place_id TEXT UNIQUE,
  synced_at INTEGER,
  source TEXT NOT NULL DEFAULT 'drive'
);
CREATE INDEX IF NOT EXISTS restaurants_geo_idx ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS restaurants_category_idx ON restaurants(category);

CREATE TABLE IF NOT EXISTS restaurant_photos (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  drive_file_id TEXT,
  kind TEXT NOT NULL,
  dishes TEXT NOT NULL DEFAULT '[]',
  vibe_tags TEXT NOT NULL DEFAULT '[]',
  quality REAL,
  source TEXT NOT NULL DEFAULT 'drive',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS restaurant_photos_restaurant_idx ON restaurant_photos(restaurant_id, kind);

CREATE TABLE IF NOT EXISTS restaurant_menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  price REAL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  category TEXT,
  description TEXT,
  dietary TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,
  confidence REAL,
  is_signature INTEGER NOT NULL DEFAULT 0,
  extracted_at INTEGER NOT NULL,
  UNIQUE(restaurant_id, normalized_name)
);
CREATE INDEX IF NOT EXISTS restaurant_menu_items_restaurant_idx ON restaurant_menu_items(restaurant_id);

CREATE TABLE IF NOT EXISTS restaurant_features (
  restaurant_id TEXT PRIMARY KEY,
  taste TEXT NOT NULL,
  price_stats TEXT,
  signature_dishes TEXT NOT NULL DEFAULT '[]',
  vibe_tags TEXT NOT NULL DEFAULT '[]',
  photo_kinds TEXT NOT NULL DEFAULT '{}',
  evidence TEXT NOT NULL DEFAULT '{}',
  feature_version TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  hero_image TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '맛집',
  region TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  hashtags TEXT NOT NULL DEFAULT '[]',
  total_distance REAL NOT NULL DEFAULT 0,
  total_duration INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  route_polyline TEXT,
  share_image_url TEXT,
  feed_photos TEXT NOT NULL DEFAULT '[]',
  feed_decor TEXT NOT NULL DEFAULT '[]',
  template_id TEXT,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS courses_feed_idx ON courses(is_public, created_at DESC);

-- Canonical public-post media. A feed card is rendered only from these R2
-- paths and placements; hero_image is never a substitute for user media.
CREATE TABLE IF NOT EXISTS course_media (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  r2_path TEXT NOT NULL,
  placement_index INTEGER NOT NULL CHECK(placement_index BETWEEN 0 AND 5),
  x REAL NOT NULL CHECK(x BETWEEN 0 AND 100),
  y REAL NOT NULL CHECK(y BETWEEN 0 AND 100),
  width REAL NOT NULL CHECK(width BETWEEN 5 AND 100),
  height REAL NOT NULL CHECK(height BETWEEN 5 AND 100),
  rotation REAL NOT NULL CHECK(rotation BETWEEN -180 AND 180),
  created_at INTEGER NOT NULL,
  UNIQUE(course_id, placement_index)
);
CREATE INDEX IF NOT EXISTS course_media_course_idx ON course_media(course_id, placement_index);

CREATE TABLE IF NOT EXISTS course_items (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(course_id, order_index)
);
CREATE INDEX IF NOT EXISTS course_items_course_idx ON course_items(course_id, order_index);

CREATE TABLE IF NOT EXISTS saved_courses (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS feed_likes (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  group_size INTEGER NOT NULL,
  filter_distance INTEGER NOT NULL,
  filter_budget INTEGER NOT NULL,
  filter_categories TEXT NOT NULL DEFAULT '[]',
  filter_dietary TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  deadline_at INTEGER,
  top_restaurant_ids TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS session_members (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  is_ready INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  UNIQUE(session_id, user_id)
);
CREATE TABLE IF NOT EXISTS swipes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  swipe_action TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(session_id, user_id, restaurant_id, round)
);

CREATE TABLE IF NOT EXISTS rec_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  slate_id TEXT,
  slate_type TEXT,
  user_id TEXT,
  course_id TEXT,
  session_id TEXT,
  group_id TEXT,
  restaurant_id TEXT,
  round INTEGER,
  position INTEGER,
  action TEXT,
  propensity REAL,
  score REAL,
  model_version TEXT,
  variant TEXT,
  dwell_ms INTEGER,
  context_json TEXT,
  idempotency_key TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rec_events_user_time_idx ON rec_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rec_events_course_time_idx ON rec_events(course_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS rec_events_idempotency_idx ON rec_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS chain_transitions (
  from_category TEXT NOT NULL,
  to_category TEXT NOT NULL,
  transition_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(from_category, to_category)
);
