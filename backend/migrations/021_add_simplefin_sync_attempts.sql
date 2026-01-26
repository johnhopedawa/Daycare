-- Migration 021: SimpleFIN sync attempts tracking
-- Purpose: Enforce daily manual sync limits per user

CREATE TABLE IF NOT EXISTS simplefin_sync_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id INTEGER NOT NULL REFERENCES simplefin_connections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simplefin_sync_attempts_user_id ON simplefin_sync_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_simplefin_sync_attempts_created_at ON simplefin_sync_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_simplefin_sync_attempts_user_day ON simplefin_sync_attempts(user_id, created_at);

COMMENT ON TABLE simplefin_sync_attempts IS 'Manual SimpleFIN sync attempts for daily rate limiting';
