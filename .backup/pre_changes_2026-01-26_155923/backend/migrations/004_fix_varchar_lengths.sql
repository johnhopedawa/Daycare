-- Migration: Fix VARCHAR field lengths that are too short
-- Updated: 2025-01-23 - Removed emergency_contact_phone (column dropped)

-- Fix phone fields in parents table if needed
ALTER TABLE parents ALTER COLUMN phone TYPE VARCHAR(30);
ALTER TABLE parents ALTER COLUMN phone_secondary TYPE VARCHAR(30);
