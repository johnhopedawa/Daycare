-- In-app notifications for admin users
CREATE TABLE IF NOT EXISTS app_notifications (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  action_url VARCHAR(255),
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_recipient ON app_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_read ON app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created ON app_notifications(created_at);
