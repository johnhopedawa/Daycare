-- Migration 019: Add account settings for SimpleFIN connections
-- Purpose: Store account type and opening balance metadata

ALTER TABLE simplefin_connections
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE;
