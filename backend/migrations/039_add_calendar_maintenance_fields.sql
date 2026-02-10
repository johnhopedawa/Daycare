-- Migration 039: Calendar maintenance/compliance extensions

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(30) DEFAULT 'EVENT',
  ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

UPDATE events SET entry_type = 'EVENT' WHERE entry_type IS NULL;
UPDATE events SET recurrence = 'NONE' WHERE recurrence IS NULL;
UPDATE events SET status = 'OPEN' WHERE status IS NULL;

ALTER TABLE events
  ALTER COLUMN entry_type SET DEFAULT 'EVENT',
  ALTER COLUMN recurrence SET DEFAULT 'NONE',
  ALTER COLUMN status SET DEFAULT 'OPEN',
  ALTER COLUMN entry_type SET NOT NULL,
  ALTER COLUMN recurrence SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_audience_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_entry_type_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_recurrence_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_audience_check
    CHECK (audience IN ('ALL', 'PARENTS', 'STAFF', 'CHILDREN', 'PRIVATE')),
  ADD CONSTRAINT events_entry_type_check
    CHECK (entry_type IN ('EVENT', 'MAINTENANCE')),
  ADD CONSTRAINT events_recurrence_check
    CHECK (recurrence IN ('NONE', 'MONTHLY', 'ANNUAL')),
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('OPEN', 'DONE'));

CREATE INDEX IF NOT EXISTS idx_events_entry_type ON events(entry_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_audience ON events(audience);
