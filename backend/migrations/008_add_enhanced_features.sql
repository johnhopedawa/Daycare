-- Migration 008: Enhanced Features (Allergies, Payment Types, Parent Accounts, etc.)

-- Drop existing role constraint and add PARENT role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('EDUCATOR', 'ADMIN', 'PARENT'));

-- Add allergies to children table
ALTER TABLE children
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '{"common": [], "other": ""}';

-- Add payment type and frequency to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'HOURLY' CHECK (payment_type IN ('HOURLY', 'SALARY')),
ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(20) DEFAULT 'BI_WEEKLY' CHECK (pay_frequency IN ('BI_WEEKLY', 'MONTHLY', 'SEMI_MONTHLY')),
ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(10, 2);

-- Add frequency to pay_periods table
ALTER TABLE pay_periods
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) CHECK (frequency IN ('BI_WEEKLY', 'MONTHLY', 'SEMI_MONTHLY'));

-- Add tax fields to parent_invoices table
ALTER TABLE parent_invoices
ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT 'BASE_PLUS_TAX' CHECK (pricing_mode IN ('BASE_PLUS_TAX', 'TOTAL_INCLUDES_TAX'));

-- Create password_resets table for admin/educator users (similar to parent_password_resets)
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on password_resets token
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- Add user_id to parents table to link to user accounts
ALTER TABLE parents
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create receipts table for payment receipts
CREATE TABLE IF NOT EXISTS payment_receipts (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES parent_payments(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES parent_invoices(id) ON DELETE CASCADE,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by INTEGER REFERENCES users(id)
);

-- Add invoice_id to parent_payments to link payments to invoices
ALTER TABLE parent_payments
ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES parent_invoices(id) ON DELETE SET NULL;

-- Update existing billing_templates to support tax settings
ALTER TABLE billing_templates
ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) DEFAULT 'BASE_PLUS_TAX' CHECK (pricing_mode IN ('BASE_PLUS_TAX', 'TOTAL_INCLUDES_TAX'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parent_payments_invoice_id ON parent_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_id ON payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice_id ON payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);
