-- Migration 011: SimpleFIN Bridge + Firefly III integration
-- Purpose: Business expense tracking via SimpleFIN + Firefly III
-- Scope: ADMIN users only

-- =====================================================
-- Table 1: simplefin_connections
-- Purpose: Store encrypted SimpleFIN Access URLs for business card connections
-- =====================================================
CREATE TABLE IF NOT EXISTS simplefin_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_url TEXT NOT NULL, -- Encrypted SimpleFIN Access URL (includes Basic Auth credentials)
  account_name VARCHAR(255) NOT NULL, -- User-friendly label (e.g., "Chase Business Visa")
  simplefin_account_id VARCHAR(255), -- SimpleFIN account ID from API
  firefly_account_id VARCHAR(255), -- Firefly III account ID
  last_sync_at TIMESTAMP, -- Last successful sync timestamp
  is_active BOOLEAN DEFAULT true, -- Active/disconnected status
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simplefin_connections_user_id ON simplefin_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_simplefin_connections_active ON simplefin_connections(is_active);

-- =====================================================
-- Table 2: transaction_sync_log
-- Purpose: Deduplication tracking for synced transactions
-- Design: Minimal fields only (dedupe-only, no retention policy)
-- =====================================================
CREATE TABLE IF NOT EXISTS transaction_sync_log (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES simplefin_connections(id) ON DELETE CASCADE,
  simplefin_transaction_id VARCHAR(255) NOT NULL, -- SimpleFIN's unique transaction ID
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When we imported this transaction
  UNIQUE(connection_id, simplefin_transaction_id) -- Prevent duplicate imports
);

-- Indexes for deduplication checks
CREATE INDEX IF NOT EXISTS idx_transaction_sync_log_connection ON transaction_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_transaction_sync_log_txn_id ON transaction_sync_log(simplefin_transaction_id);

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE simplefin_connections IS 'Business card connections via SimpleFIN Bridge (ADMIN only)';
COMMENT ON COLUMN simplefin_connections.access_url IS 'Encrypted SimpleFIN Access URL with embedded Basic Auth credentials';
COMMENT ON COLUMN simplefin_connections.account_name IS 'User-provided friendly name for the business card';
COMMENT ON COLUMN simplefin_connections.firefly_account_id IS 'Firefly III account ID created for this card';

COMMENT ON TABLE transaction_sync_log IS 'Deduplication tracking for SimpleFIN transaction imports (no retention policy)';
COMMENT ON COLUMN transaction_sync_log.simplefin_transaction_id IS 'SimpleFIN unique transaction ID for deduplication';
