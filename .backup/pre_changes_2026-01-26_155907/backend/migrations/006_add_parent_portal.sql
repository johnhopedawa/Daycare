-- Parent portal tables for Phase 4

-- Parent sessions (for authentication)
CREATE TABLE IF NOT EXISTS parent_sessions (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent password reset tokens
CREATE TABLE IF NOT EXISTS parent_password_resets (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  reset_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages between parents and staff
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (from_user_id IS NOT NULL AND from_parent_id IS NULL) OR
    (from_user_id IS NULL AND from_parent_id IS NOT NULL)
  ),
  CHECK (
    (to_user_id IS NOT NULL AND to_parent_id IS NULL) OR
    (to_user_id IS NULL AND to_parent_id IS NOT NULL)
  )
);

-- Indexes for Phase 4 tables
CREATE INDEX IF NOT EXISTS idx_parent_sessions_parent ON parent_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_token ON parent_sessions(token);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_parent ON parent_password_resets(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_token ON parent_password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_parent ON messages(from_parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_parent ON messages(to_parent_id);
