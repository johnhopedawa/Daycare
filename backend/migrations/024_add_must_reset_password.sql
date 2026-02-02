-- Force password reset for users (parents)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT false;
