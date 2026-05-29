-- Fine-tuning datasets and jobs
CREATE TABLE IF NOT EXISTS fine_tuning_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'jsonl',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fine_tuning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_model VARCHAR(200) NOT NULL,
    dataset_id UUID REFERENCES fine_tuning_datasets(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result_model_id UUID,
    hyperparams JSONB,
    progress INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ft_datasets_user ON fine_tuning_datasets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ft_jobs_user ON fine_tuning_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ft_jobs_status ON fine_tuning_jobs(status);
