-- Migration 009: Add payment tracking fields

-- Add recorded_by and transaction_reference to parent_payments
ALTER TABLE parent_payments
ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_parent_payments_recorded_by ON parent_payments(recorded_by);
