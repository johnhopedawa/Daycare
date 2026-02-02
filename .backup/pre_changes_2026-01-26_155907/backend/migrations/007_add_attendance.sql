-- Attendance tracking for children
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  checked_in_by INTEGER REFERENCES users(id),
  checked_out_by INTEGER REFERENCES users(id),
  parent_dropped_off VARCHAR(100),
  parent_picked_up VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ABSENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'SICK', 'VACATION')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_id, attendance_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_child_id ON attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON attendance(child_id, attendance_date);

-- Recurring billing templates
CREATE TABLE IF NOT EXISTS billing_templates (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
  template_name VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
  line_items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0.13,
  is_active BOOLEAN DEFAULT true,
  next_invoice_date DATE,
  last_generated_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_templates_parent ON billing_templates(parent_id);
CREATE INDEX IF NOT EXISTS idx_billing_templates_active ON billing_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_templates_next_date ON billing_templates(next_invoice_date);

-- Notification queue
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('EMAIL', 'SMS', 'IN_APP')),
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('PARENT', 'USER')),
  recipient_id INTEGER NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  sent_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
