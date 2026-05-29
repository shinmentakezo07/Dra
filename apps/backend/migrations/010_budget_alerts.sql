-- Budget alerts and hard caps
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    threshold_percent INT NOT NULL CHECK (threshold_percent BETWEEN 1 AND 100),
    alert_type VARCHAR(20) NOT NULL DEFAULT 'email',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hard_limit INT NOT NULL,
    soft_limit INT,
    action_on_exceed VARCHAR(20) NOT NULL DEFAULT 'block',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_user ON budget_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budget_caps_user ON budget_caps(user_id, is_active);
