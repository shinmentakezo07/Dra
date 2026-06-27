-- 008_admin_sessions.sql
-- Admin session tracking for audit and security.

BEGIN;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_status ON admin_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);

-- Update users table last_login_at index if missing
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

COMMIT;
