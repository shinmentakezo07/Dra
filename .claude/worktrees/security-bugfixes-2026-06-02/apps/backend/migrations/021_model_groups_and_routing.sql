-- 021_model_groups_and_routing.sql
-- Adds model groups (load balancing), fallback chains, credential vault,
-- wildcard routing, and routing weight to model_registry.

BEGIN;

-- Model group: groups multiple deployments under one user-facing name.
-- E.g., "gpt-4o" can have OpenAI + Azure + self-hosted deployments.
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS model_group TEXT DEFAULT '';

-- Fallback models: JSON array of model_ids to try if this model fails.
-- E.g., '["openai/gpt-4o", "anthropic/claude-sonnet-4"]'
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS fallback_models JSONB DEFAULT '[]';

-- Credential vault reference: name of a centralized credential set.
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS credential_name TEXT DEFAULT '';

-- Routing weight for load balancing within a model group (higher = more traffic).
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS routing_weight INT NOT NULL DEFAULT 1;

-- Wildcard model: matches any model_id for this provider when true.
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS is_wildcard BOOLEAN NOT NULL DEFAULT false;

-- Index for model group lookups (used during routing).
CREATE INDEX IF NOT EXISTS idx_model_registry_group ON model_registry(model_group) WHERE model_group != '';

-- Index for wildcard lookups.
CREATE INDEX IF NOT EXISTS idx_model_registry_wildcard ON model_registry(provider_id) WHERE is_wildcard = true;

-- Credential vault table for centralized key management.
CREATE TABLE IF NOT EXISTS credential_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL DEFAULT 'openai',
  api_key_encrypted TEXT NOT NULL,
  api_base TEXT DEFAULT '',
  extra_config JSONB DEFAULT '{}',
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_vault_name ON credential_vault(name);

COMMIT;
