-- Migration 020: Events for calendar/timeline

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  audience VARCHAR(50) DEFAULT 'ALL' CHECK (audience IN ('ALL', 'PARENTS', 'STAFF', 'CHILDREN')),
  description TEXT,
  requires_rsvp BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
