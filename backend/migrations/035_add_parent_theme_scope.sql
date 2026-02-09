-- Migration 035: Add parent portal theme assignment

ALTER TABLE daycare_settings
  ADD COLUMN IF NOT EXISTS parent_theme_id INTEGER REFERENCES themes(id);

UPDATE daycare_settings
SET parent_theme_id = COALESCE(parent_theme_id, theme_id, 1);
