ALTER TABLE children
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_original_filename TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMP;
