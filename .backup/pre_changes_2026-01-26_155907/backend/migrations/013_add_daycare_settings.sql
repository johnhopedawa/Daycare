-- Migration 013: Daycare settings (tax configuration)

CREATE TABLE IF NOT EXISTS daycare_settings (
  id SERIAL PRIMARY KEY,
  tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
  tax_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO daycare_settings (id, tax_rate, tax_enabled)
VALUES (1, 0.05, true)
ON CONFLICT (id) DO NOTHING;
