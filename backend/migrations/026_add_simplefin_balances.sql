-- Migration 026: Add available balance metadata to SimpleFIN connections
-- Purpose: Store available balances + optional credit limits for unposted transaction estimates

ALTER TABLE simplefin_connections
  ADD COLUMN IF NOT EXISTS available_balance NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS available_balance_date DATE,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2);
