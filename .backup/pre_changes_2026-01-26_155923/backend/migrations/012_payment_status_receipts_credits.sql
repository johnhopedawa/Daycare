-- Migration 012: Normalize payment/invoice statuses, backfill receipts, and add parent credits

-- Normalize parent payment statuses
UPDATE parent_payments
SET status = 'PAID'
WHERE status = 'COMPLETED';

UPDATE parent_payments
SET status = 'PENDING'
WHERE status IS NULL
  OR status NOT IN ('PENDING', 'PAID');

-- Normalize parent invoice statuses
UPDATE parent_invoices
SET status = 'PARTIAL'
WHERE status = 'PARTIALLY_PAID';

UPDATE parent_invoices
SET status = 'SENT'
WHERE status = 'UNPAID';

UPDATE parent_invoices
SET status = 'DRAFT'
WHERE status IS NULL;

-- Ensure status constraints match the canonical enums
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_payments_status_check') THEN
    ALTER TABLE parent_payments DROP CONSTRAINT parent_payments_status_check;
  END IF;
END $$;

ALTER TABLE parent_payments
  ADD CONSTRAINT parent_payments_status_check CHECK (status IN ('PENDING', 'PAID'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_invoices_status_check') THEN
    ALTER TABLE parent_invoices DROP CONSTRAINT parent_invoices_status_check;
  END IF;
END $$;

ALTER TABLE parent_invoices
  ADD CONSTRAINT parent_invoices_status_check CHECK (status IN ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'));

-- Backfill payment receipts from legacy receipt_number field
INSERT INTO payment_receipts (payment_id, invoice_id, receipt_number, amount, generated_by)
SELECT pp.id, pp.invoice_id, pp.receipt_number, pp.amount, pp.recorded_by
FROM parent_payments pp
LEFT JOIN payment_receipts pr ON pr.payment_id = pp.id
WHERE pp.receipt_number IS NOT NULL
  AND pr.id IS NULL;

-- Parent credits (for overpayments and unapplied payments)
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10, 2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS parent_credits (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES parent_payments(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES parent_invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  credit_type VARCHAR(20) NOT NULL CHECK (credit_type IN ('EARNED', 'APPLIED', 'ADJUSTMENT')),
  memo TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_credits_parent_id ON parent_credits(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_credits_payment_id ON parent_credits(payment_id);
