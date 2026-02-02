-- Users table (both educators and admins)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('EDUCATOR', 'ADMIN')),
  hourly_rate DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  annual_sick_days DECIMAL(7,2) DEFAULT 0,
  annual_vacation_days DECIMAL(7,2) DEFAULT 0,
  sick_days_remaining DECIMAL(7,2) DEFAULT 0,
  vacation_days_remaining DECIMAL(7,2) DEFAULT 0,
  carryover_enabled BOOLEAN DEFAULT FALSE,
  date_employed DATE,
  ytd_gross DECIMAL(10,2) DEFAULT 0,
  ytd_cpp DECIMAL(10,2) DEFAULT 0,
  ytd_ei DECIMAL(10,2) DEFAULT 0,
  ytd_tax DECIMAL(10,2) DEFAULT 0,
  ytd_hours DECIMAL(10,2) DEFAULT 0,
  sin VARCHAR(11),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time entries
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_hours DECIMAL(5, 2) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pay periods
CREATE TABLE IF NOT EXISTS pay_periods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  closed_at TIMESTAMP,
  closed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payouts (prepared when pay period closes)
CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  pay_period_id INTEGER NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_hours DECIMAL(10, 2) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  gross_amount DECIMAL(10, 2) NOT NULL,
  deductions DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices (generated per educator per pay period)
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  pay_period_id INTEGER NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  total_hours DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paystubs (generated for each payout)
CREATE TABLE IF NOT EXISTS paystubs (
  id SERIAL PRIMARY KEY,
  payout_id INTEGER NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pay_period_id INTEGER NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  stub_number VARCHAR(50) UNIQUE NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parents
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  child_names TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'PARENT' CHECK (role IN ('PARENT')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Children
CREATE TABLE IF NOT EXISTS children (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  enrollment_start_date DATE NOT NULL,
  enrollment_end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENROLLED', 'INACTIVE', 'WAITLIST')),
  monthly_rate DECIMAL(10, 2),
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY')),
  allergies TEXT,
  medical_notes TEXT,
  waitlist_priority INTEGER,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Child relationships (many-to-many)
CREATE TABLE IF NOT EXISTS parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'Parent',
  is_primary_contact BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  has_billing_responsibility BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, child_id)
);

-- Parent invoices (separate from educator invoices)
CREATE TABLE IF NOT EXISTS parent_invoices (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  line_items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance_due DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE')),
  notes TEXT,
  payment_terms VARCHAR(100),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent payments
CREATE TABLE IF NOT EXISTS parent_payments (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES parent_invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  payment_method VARCHAR(50),
  notes TEXT,
  receipt_number VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent sessions (for authentication)
CREATE TABLE IF NOT EXISTS parent_sessions (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent password reset tokens
CREATE TABLE IF NOT EXISTS parent_password_resets (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  reset_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages between parents and staff
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (from_user_id IS NOT NULL AND from_parent_id IS NULL) OR
    (from_user_id IS NULL AND from_parent_id IS NOT NULL)
  ),
  CHECK (
    (to_user_id IS NOT NULL AND to_parent_id IS NULL) OR
    (to_user_id IS NULL AND to_parent_id IS NOT NULL)
  )
);

-- Schedules (shifts created by admin)
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  decline_reason TEXT,
  decline_type VARCHAR(20) CHECK (decline_type IN ('SICK_DAY', 'VACATION_DAY', 'UNPAID')),
  responded_at TIMESTAMP,
  recurrence_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurrence patterns (for recurring schedules)
CREATE TABLE IF NOT EXISTS schedule_recurrence (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_payouts_pay_period ON payouts(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_parent ON parent_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_invoice ON parent_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_parent_payments_status ON parent_payments(status);
CREATE INDEX IF NOT EXISTS idx_children_created_by ON children(created_by);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_parent ON parent_invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_child ON parent_invoices(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_status ON parent_invoices(status);
CREATE INDEX IF NOT EXISTS idx_parent_invoices_created_by ON parent_invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedule_recurrence_user_id ON schedule_recurrence(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_recurrence_created_by ON schedule_recurrence(created_by);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_parent ON parent_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_token ON parent_sessions(token);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_parent ON parent_password_resets(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_token ON parent_password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_parent ON messages(from_parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_parent ON messages(to_parent_id);

-- Document categories (admin-managed)
CREATE TABLE IF NOT EXISTS document_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
  tags TEXT[], -- Array of custom tags
  description TEXT,
  -- Future-proofing for linking
  linked_child_id INTEGER, -- Will reference children table in future
  linked_parent_id INTEGER, -- Will reference parents table in future
  -- Permissions (JSON array like ["ADMIN", "PARENT"])
  can_view_roles JSONB DEFAULT '["ADMIN"]'::jsonb,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_linked_child ON documents(linked_child_id);
CREATE INDEX IF NOT EXISTS idx_documents_linked_parent ON documents(linked_parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- NOTE: document_categories table is DEPRECATED
-- Categories are now hardcoded in the application (MEDICAL, ENROLLMENT, EMERGENCY, PHOTO_CONSENT, INSURANCE, OTHER)
