-- Pending SimpleFIN claims for account selection flow
CREATE TABLE IF NOT EXISTS simplefin_pending_claims (
  claim_token VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_url TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simplefin_pending_claims_user_id ON simplefin_pending_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_simplefin_pending_claims_expires_at ON simplefin_pending_claims(expires_at);
