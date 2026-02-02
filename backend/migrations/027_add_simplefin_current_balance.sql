-- Migration 027: Add current balance metadata to SimpleFIN connections
-- Purpose: Store SimpleFIN account balance + date for accurate current balance display

ALTER TABLE simplefin_connections
  ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS balance_date DATE;
