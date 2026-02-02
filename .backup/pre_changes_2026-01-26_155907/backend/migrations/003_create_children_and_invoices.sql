-- Migration: Phase 3 - Children Management and Parent Invoicing

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  enrollment_start_date DATE NOT NULL,
  enrollment_end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'WAITLIST')),

  -- Billing information
  monthly_rate DECIMAL(10, 2),
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY')),

  -- Medical & Emergency information
  allergies TEXT,
  medical_notes TEXT,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),

  -- Additional notes
  notes TEXT,

  -- Audit fields
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Children relationship (many-to-many)
CREATE TABLE IF NOT EXISTS parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- 'Mother', 'Father', 'Guardian', 'Emergency Contact', etc.
  is_primary_contact BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  has_billing_responsibility BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, child_id)
);

-- Update parents table to support future login and better billing
ALTER TABLE parents ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'PARENT' CHECK (role IN ('PARENT'));
ALTER TABLE parents ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS province VARCHAR(50);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(20);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('EMAIL', 'PHONE', 'TEXT'));
ALTER TABLE parents ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Parent invoices (for daycare billing to parents)
CREATE TABLE IF NOT EXISTS parent_invoices (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Line items stored as JSONB for flexibility
  -- Example: [{"description": "Monthly Daycare - Johnny", "quantity": 1, "rate": 1200.00, "amount": 1200.00}]
  line_items JSONB NOT NULL,

  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0, -- e.g., 0.05 for 5% GST
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Payment tracking
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance_due DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('DRAFT', 'SENT', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),

  -- Notes and references
  notes TEXT,
  payment_terms TEXT DEFAULT 'Due upon receipt',

  -- Document linking (PDF invoice will be stored in documents table)
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,

  -- Audit fields
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link parent_payments to invoices (update existing table)
ALTER TABLE parent_payments ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES parent_invoices(id) ON DELETE SET NULL;

-- Add foreign key constraints to documents table for children (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_linked_child'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_linked_child
      FOREIGN KEY (linked_child_id) REFERENCES children(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_linked_parent'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_linked_parent
      FOREIGN KEY (linked_parent_id) REFERENCES parents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_created_by ON children(created_by);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_parent ON parent_invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_child ON parent_invoices(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_status ON parent_invoices(status);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_invoice_number ON parent_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_parent_payments_invoice ON parent_payments(invoice_id);

-- Migrate existing child_names from parents to notes (DISABLED - no longer needed with new family creation system)
-- This migration was causing duplicate "Children:" entries in notes field
-- UPDATE parents
-- SET notes = CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n' ELSE '' END, 'Children: ', child_names)
-- WHERE child_names IS NOT NULL AND child_names != '';
