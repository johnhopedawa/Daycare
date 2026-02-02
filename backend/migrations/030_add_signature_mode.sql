-- Migration 030: Add signature display mode

ALTER TABLE daycare_settings
  ADD COLUMN IF NOT EXISTS signature_mode VARCHAR(20) NOT NULL DEFAULT 'both';
