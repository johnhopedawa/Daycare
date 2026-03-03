-- Migration 042: Parent-facing newsletters and child daily care logs

CREATE TABLE IF NOT EXISTS newsletters (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletters_owner_id ON newsletters(owner_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_published_at ON newsletters(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_is_published ON newsletters(is_published);

CREATE TABLE IF NOT EXISTS care_logs (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type VARCHAR(10) NOT NULL CHECK (log_type IN ('NAP', 'PEE', 'POO')),
  occurred_at TIME,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_care_logs_owner_date ON care_logs(owner_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_care_logs_child_date ON care_logs(child_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_care_logs_type ON care_logs(log_type);
