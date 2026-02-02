-- Migration 029: Add signature image to daycare settings

ALTER TABLE daycare_settings
  ADD COLUMN IF NOT EXISTS signature_image TEXT;
