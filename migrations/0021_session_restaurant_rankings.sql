CREATE TABLE IF NOT EXISTS session_restaurant_rankings (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  initial_ranking_json TEXT NOT NULL,
  final_ranking_json TEXT NOT NULL,
  selected_restaurant_id TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, user_id, generation)
);
