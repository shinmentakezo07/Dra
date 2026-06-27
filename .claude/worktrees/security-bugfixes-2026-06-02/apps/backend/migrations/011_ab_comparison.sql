-- A/B model comparison jobs
CREATE TABLE IF NOT EXISTS ab_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_a VARCHAR(200) NOT NULL,
    model_b VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    result_a TEXT,
    result_b TEXT,
    latency_a INT,
    latency_b INT,
    cost_a INT,
    cost_b INT,
    tokens_a INT,
    tokens_b INT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_comparisons_user ON ab_comparisons(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_comparisons_status ON ab_comparisons(status);
