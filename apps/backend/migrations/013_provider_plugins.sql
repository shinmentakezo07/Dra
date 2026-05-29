-- Custom provider plugins
CREATE TABLE IF NOT EXISTS provider_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'custom',
    base_url VARCHAR(500) NOT NULL,
    api_key_env VARCHAR(100),
    model_list_endpoint VARCHAR(200) DEFAULT '/v1/models',
    chat_endpoint VARCHAR(200) DEFAULT '/v1/chat/completions',
    embedding_endpoint VARCHAR(200) DEFAULT '/v1/embeddings',
    headers JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_plugins_active ON provider_plugins(is_active);
