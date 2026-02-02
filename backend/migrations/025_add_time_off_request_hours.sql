-- Track requested hours for time off (optional)
ALTER TABLE time_off_requests
  ADD COLUMN IF NOT EXISTS hours NUMERIC(5,2);
