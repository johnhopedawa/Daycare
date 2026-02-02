-- Migration 018: Business expense category rules
-- Purpose: Allow keyword-based auto categorization of business transactions

CREATE TABLE IF NOT EXISTS business_expense_category_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(120) NOT NULL,
  category VARCHAR(120) NOT NULL,
  match_field VARCHAR(20) NOT NULL DEFAULT 'description',
  transaction_type VARCHAR(20) NOT NULL DEFAULT 'expense',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_expense_rules_user
  ON business_expense_category_rules(user_id);
