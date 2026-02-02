-- Time off requests for staff (educators)
CREATE TABLE IF NOT EXISTS time_off_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('SICK', 'VACATION', 'UNPAID')),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_user ON time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
