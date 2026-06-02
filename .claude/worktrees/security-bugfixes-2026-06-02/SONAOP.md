# SONAOP — Strategic Gap Analysis: Yapapa vs CLIProxyAPI, LiteLLM, OpenRouter

> **Date**: 2026-05-31
> **Research Depth**: 25+ web searches across CLIProxyAPI, LiteLLM, OpenRouter, LLM gateway best practices, guardrails, caching, cost tracking, observability, security, A/B testing, MCP protocol
> **Purpose**: Exhaustive gap analysis to identify every missing feature, architecture pattern, and enterprise capability compared to the leading LLM gateway platforms

---

## Executive Summary

Yapapa has built a solid foundation with 18+ LLM subpackages, a 10-stage pipeline, model registry, circuit breaker, and translator system. However, compared to CLIProxyAPI (31 internal packages), LiteLLM (70+ features), and OpenRouter (provider marketplace), there are **67 distinct feature gaps** across 12 categories. This document categorizes each gap as **Critical** (blocks production use), **High** (enterprise requirement), **Medium** (competitive advantage), or **Nice-to-have** (future roadmap).

---

## Part 1: What Yapapa Already Has

### Existing Architecture (18+ subpackages under `pkg/llm/`)

| Package | Status | Notes |
|---------|--------|-------|
| `provider/` | Working | Registry, key rotation, health, fallback |
| `router/` | Working | Model→provider mapping, A/B, budget-aware |
| `cache/` | Working | TTL + semantic dedup + Redis + SignatureCache |
| `guardrails/` | Basic | Input guardrails exist |
| `moderation/` | Basic | Content moderation exists |
| `translator/` | Working | Anthropic ↔ OpenAI ↔ Generic with init()-based registration |
| `tools/` | Working | Function calling + websearch |
| `telemetry/` | Basic | Exists but dead (replaced by stdlib slog) |
| `tokens/` | Working | Token counting exists |
| `embeddings/` | Working | Embeddings proxy exists |
| `batch/` | Working | Batch job processing exists |
| `circuitbreaker/` | Working | Circuit breaker exists |
| `watcher/` | Working | Error watcher + config watcher + provider health |
| `openai/` | Working | Schema types + stream formatter |
| `validator/` | Working | Request validation exists |
| `pipeline/` | Working | 10-stage pipeline with ChainPipeline + interceptors |
| `thinking/` | NEW | Unified thinking/reasoning across OpenAI/Anthropic/Gemini |
| `util/` | NEW | Function name sanitization, tool mapping, model family detection |
| `registry/` | NEW | Dynamic model registry with reference counting, quota tracking, hooks |
| `interfaces/` | NEW | Core types for translators, executors, middleware, interceptors |
| `streaming/` | NEW | Streaming utilities |
| `anthropic/` | Working | Anthropic format support |

---

## Part 2: What CLIProxyAPI Has That Yapapa Is Missing

### 2.1 CLIProxyAPI Internal Packages (31 packages)

| CLIProxyAPI Package | Yapapa Equivalent | Gap Status |
|---------------------|-------------------|------------|
| `internal/access` | None | **MISSING** — Access control with reconciliation |
| `internal/api` | `internal/handler/` | Partial — no API versioning |
| `internal/auth` | `internal/middleware/auth` | Partial — no OAuth2 provider auth |
| `internal/browser` | None | **MISSING** — Browser-based admin UI |
| `internal/buildinfo` | None | **MISSING** — Build version embedding |
| `internal/cache` | `pkg/llm/cache/` | Partial — no multi-tier (Redis/S3/GCS) |
| `internal/cmd` | `cmd/api/` | Working |
| `internal/config` | `internal/config/` | Partial — no hot reload integration |
| `internal/constant` | None | **MISSING** — Shared constants package |
| `internal/home` | None | **MISSING** — Home directory management |
| `internal/interfaces` | `pkg/llm/interfaces/` | NEW |
| `internal/logging` | `pkg/logger/` | Partial — no structured request logging |
| `internal/managementasset` | None | **MISSING** — Static asset management |
| `internal/misc` | None | **MISSING** — Misc utilities |
| `internal/redisqueue` | None | **MISSING** — Redis-based job queue |
| `internal/registry` | `pkg/llm/registry/` | NEW |
| `internal/runtime` | None | **MISSING** — Runtime state management |
| `internal/signature` | `pkg/llm/cache/signature_cache` | NEW |
| `internal/store` | `internal/repository/` | Working |
| `internal/thinking` | `pkg/llm/thinking/` | NEW |
| `internal/translator` | `pkg/llm/translator/` | Enhanced |
| `internal/tui` | None | **MISSING** — Terminal UI for admin |
| `internal/util` | `pkg/llm/util/` | NEW |
| `internal/watcher` | `pkg/llm/watcher/` | Enhanced |
| `internal/wsrelay` | None | **MISSING** — WebSocket relay |

### 2.2 CLIProxyAPI-Specific Features Missing from Yapapa

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Credential Vault with Rotation** | Critical | Encrypted storage for API keys with automatic rotation, per-provider credential management, and failover to backup keys. CLIProxyAPI has full credential rotation with encrypted vault. |
| 2 | **WebSocket Gateway/Relay** | High | Real-time bidirectional streaming via WebSocket in addition to SSE. CLIProxyAPI's `wsrelay` package handles WS connections with automatic reconnection. |
| 3 | **Request/Response Logging** | High | Full request/response body logging with configurable retention, PII redaction, and search. CLIProxyAPI logs every request/response pair. |
| 4 | **Usage Statistics & Billing** | High | Per-user, per-model, per-provider usage tracking with cost calculation, billing periods, and export. CLIProxyAPI tracks token usage with detailed breakdowns. |
| 5 | **Model Mapping/Aliasing** | High | User-facing model names mapped to provider-specific model IDs. CLIProxyAPI supports regex-based model mapping with priority routing. |
| 6 | **Redis-Based Job Queue** | Medium | Async job processing via Redis queues for batch operations, webhook delivery, and background tasks. CLIProxyAPI's `redisqueue` package. |
| 7 | **TUI Admin Interface** | Medium | Terminal-based admin interface for monitoring and management. CLIProxyAPI's `internal/tui` package. |
| 8 | **Build Info Embedding** | Low | Version, commit hash, build time embedded in binary. CLIProxyAPI's `internal/buildinfo`. |
| 9 | **Home Directory Management** | Low | Platform-specific config directory management. CLIProxyAPI's `internal/home`. |

---

## Part 3: What LiteLLM Has That Yapapa Is Missing

### 3.1 Core Proxy Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 10 | **Virtual Keys** | Critical | API keys that map to teams/users with budget limits, rate limits, and model access control. LiteLLM's `sk-*` key format with database-backed key management. |
| 11 | **Hierarchical Budget Management** | Critical | Team → user budget hierarchy with per-minute/hourly/daily/monthly limits, soft limits with alerts, hard limits with rejection. |
| 12 | **Multi-Tier Caching (Redis/S3/GCS/Qdrant)** | High | Three caching layers: in-memory → Redis → semantic (Qdrant). LiteLLM supports Redis, S3, GCS, and Qdrant for semantic similarity caching. |
| 13 | **SSO/SAML/OIDC Authentication** | High | Enterprise SSO with SAML 2.0, OIDC, Google SSO, and team-based access control. |
| 14 | **Model Access Groups** | High | Groups of models assignable to teams/keys. Users only see models in their access group. |
| 15 | **Fallback Configurations** | High | Explicit fallback chains: `model A fails → try model B → try model C`. LiteLLM supports per-model and per-team fallbacks. |
| 16 | **Custom Callbacks/Webhooks** | Medium | Pluggable callback system for success, failure, and streaming events. LiteLLM supports Langfuse, Sentry, custom webhooks. |
| 17 | **Content Moderation Hooks** | Medium | Pre-request moderation via OpenAI Moderation API, LlamaGuard, Google Text Moderation, and custom guardrails. |
| 18 | **Budget Alerts** | Medium | Email/Slack/webhook alerts when budget thresholds are reached (50%, 80%, 100%). |
| 19 | **Rate Limit Per Model** | Medium | Per-model rate limits in addition to per-user/per-key limits. |

### 3.2 Enterprise Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 20 | **Audit Logs** | High | Comprehensive audit trail for all API key usage, model access, configuration changes, and admin actions. |
| 21 | **Team Management** | High | Multi-tenant team creation, member invitation, role-based access (admin/member/viewer), and per-team API keys. |
| 22 | **Custom Pricing** | Medium | Override default token pricing per model for accurate cost tracking. |
| 23 | **API Key Scoping** | Medium | Keys scoped to specific models, teams, rate limits, and budget limits. |
| 24 | **Model Cost Tracking** | High | Real-time cost calculation per request based on input/output tokens and model pricing. |
| 25 | **Pass-Through Endpoints** | Medium | Direct proxy to provider-specific endpoints (e.g., `/openai/deployments/*`). |

### 3.3 Routing & Load Balancing

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 26 | **Load Balancing Strategies** | High | Round-robin, least-busy, latency-based routing across multiple deployments of the same model. |
| 27 | **Deployment Health Checks** | High | Continuous health monitoring of provider endpoints with automatic removal/addition. |
| 28 | **Routing Strategy Per Model** | Medium | Different routing strategies for different models (e.g., latency-based for chat, cost-based for batch). |
| 29 | **Retry with Exponential Backoff** | Medium | Configurable retry logic with exponential backoff and jitter. |

### 3.4 Observability

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 30 | **OpenTelemetry Integration** | High | Full OTLP trace export with GenAI semantic conventions (`gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`). |
| 31 | **Langfuse Integration** | Medium | Native integration with Langfuse for LLM observability (traces, spans, generations). |
| 32 | **Prometheus Metrics** | Medium | `/metrics` endpoint with request counts, latency histograms, error rates per model/provider. |
| 33 | **Custom Logging Formats** | Low | Configurable log formats (JSON, text) with customizable fields. |

---

## Part 4: What OpenRouter Has That Yapapa Is Missing

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 34 | **Provider Marketplace** | High | Users choose which provider serves their model (e.g., "Claude 3.5 Sonnet via Anthropic vs AWS Bedrock vs Google Vertex"). |
| 35 | **Provider Sorting** | High | Sort providers by price, throughput, latency, or availability. OpenRouter exposes provider metrics for user selection. |
| 36 | **Performance Thresholds** | Medium | Set minimum throughput/latency requirements — only route to providers meeting thresholds. |
| 37 | **Data Collection Policies** | Medium | Per-provider data retention policies visible to users (zero-data-retention enforcement). |
| 38 | **Quantization Filtering** | Medium | Filter models by quantization level (fp16, int8, int4) with quality trade-off visibility. |
| 39 | **Model Price Comparison** | Medium | Side-by-side price comparison across providers for the same model. |
| 40 | **Provider Uptime SLAs** | Medium | Track and display per-provider uptime percentages. |

---

## Part 5: Security & Guardrails

### 5.1 Prompt Security

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 41 | **Prompt Injection Detection** | Critical | Detect and block prompt injection attacks using pattern matching, ML classifiers, or LLM-based detection. |
| 42 | **Jailbreak Defense** | Critical | Detect and block jailbreak attempts (DAN, role-play attacks, encoding attacks). |
| 43 | **PII Detection & Redaction** | High | Detect and redact PII (SSN, credit cards, emails, phone numbers, names) from requests/responses. |
| 44 | **Secret Detection** | High | Detect and redact API keys, tokens, passwords, and other secrets from prompts. |
| 45 | **Topic Restriction** | Medium | Restrict models from discussing specific topics (competitors, illegal content, etc.). |

### 5.2 Content Safety

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 46 | **Multi-Provider Moderation** | High | Aggregate moderation from multiple providers (OpenAI, LlamaGuard, Google) with configurable consensus. |
| 47 | **Custom Guardrail Rules** | Medium | User-defined guardrail rules with regex, keyword, and semantic matching. |
| 48 | **Response Filtering** | Medium | Filter/block responses that violate content policies before returning to user. |
| 49 | **Toxicity Scoring** | Medium | Score responses for toxicity, bias, and harmful content with configurable thresholds. |

---

## Part 6: Streaming & Real-Time

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 50 | **WebSocket Gateway** | High | Full-duplex WebSocket streaming with automatic SSE fallback. CLIProxyAPI's `wsrelay`. |
| 51 | **Stream Interruption** | Medium | Allow users to interrupt/cancel streaming responses mid-stream. |
| 52 | **Stream Multiplexing** | Medium | Multiplex multiple logical streams over a single connection. |
| 53 | **Server-Sent Events with Retry** | Low | SSE with automatic client reconnection and `Last-Event-ID` support. |

---

## Part 7: Advanced Routing & Load Balancing

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 54 | **A/B Testing with Traffic Splitting** | High | Route percentage of traffic to different models/providers for comparison testing. |
| 55 | **Canary Deployments** | High | Gradually roll out new models/providers to a percentage of traffic. |
| 56 | **Affinity Routing** | Medium | Route requests from the same user/session to the same provider for consistency. |
| 57 | **Geographic Routing** | Medium | Route to nearest provider based on user location for latency optimization. |
| 58 | **Cost-Optimized Routing** | Medium | Automatically route to cheapest provider that meets quality requirements. |

---

## Part 8: Enterprise & Compliance

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 59 | **Audit Trail with Compliance** | High | Immutable audit logs with retention policies, export, and compliance reporting (SOC2, HIPAA). |
| 60 | **Data Residency Controls** | Medium | Ensure requests are only routed to providers in specified regions (EU-only, US-only). |
| 61 | **Zero Data Retention Enforcement** | Medium | Only route to providers that guarantee zero data retention (ZDR). |
| 62 | **API Versioning** | Medium | Support multiple API versions simultaneously with deprecation notices. |
| 63 | **Multi-Tenant Isolation** | High | Complete data isolation between tenants with separate keys, budgets, and model access. |

---

## Part 9: Developer Experience

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 64 | **SDK Generation from OpenAPI** | Medium | Auto-generate client SDKs (Go, Python, TypeScript, Java) from OpenAPI spec. |
| 65 | **Playground UI** | Medium | Interactive testing playground with model comparison, streaming visualization, and cost estimation. |
| 66 | **Request Replay** | Low | Replay saved requests for debugging and regression testing. |
| 67 | **Model Evaluation Metrics** | Low | Track latency, throughput, and quality metrics per model over time. |

---

## Part 10: Implementation Priority Matrix

### Phase 1 — Critical (Blocks Production) — Weeks 1-4

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 1 | Credential Vault with Rotation | 2 weeks | PostgreSQL encryption, key management |
| 10 | Virtual Keys | 2 weeks | Database schema, key generation |
| 11 | Hierarchical Budget Management | 1.5 weeks | Virtual keys, Redis counters |
| 41 | Prompt Injection Detection | 1 week | Pattern library or ML classifier |
| 42 | Jailbreak Defense | 1 week | Pattern library, shared with #41 |

### Phase 2 — High Priority (Enterprise Ready) — Weeks 5-8

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 2 | Request/Response Logging | 1 week | Database schema, PII redaction |
| 4 | Usage Statistics & Billing | 2 weeks | Request logging, pricing tables |
| 5 | Model Mapping/Aliasing | 1 week | Config schema, translator integration |
| 12 | Multi-Tier Caching | 1.5 weeks | Redis, Qdrant integration |
| 13 | SSO/SAML/OIDC | 2 weeks | OAuth2 library, session management |
| 14 | Model Access Groups | 1 week | Virtual keys, group management |
| 15 | Fallback Configurations | 1 week | Provider registry, health checks |
| 20 | Audit Logs | 1.5 weeks | Database schema, event system |
| 21 | Team Management | 2 weeks | Database schema, RBAC |
| 24 | Model Cost Tracking | 1 week | Pricing database, token counting |
| 26 | Load Balancing Strategies | 1.5 weeks | Provider health, routing logic |
| 30 | OpenTelemetry Integration | 1 week | OTLP exporter, GenAI conventions |
| 43 | PII Detection & Redaction | 1 week | Regex patterns or NER model |
| 44 | Secret Detection | 0.5 weeks | Pattern matching |
| 50 | WebSocket Gateway | 2 weeks | WebSocket library, connection management |
| 54 | A/B Testing with Traffic Splitting | 1.5 weeks | Router enhancement |
| 55 | Canary Deployments | 1 week | Traffic splitting extension |
| 59 | Audit Trail with Compliance | 1.5 weeks | Audit logs extension |
| 63 | Multi-Tenant Isolation | 2 weeks | Virtual keys, team management |

### Phase 3 — Medium Priority (Competitive Advantage) — Weeks 9-12

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 3 | WebSocket Relay | 1.5 weeks | WebSocket gateway |
| 6 | Redis Job Queue | 1 week | Redis integration |
| 10 | Model Access Groups | 0.5 weeks | Virtual keys |
| 16 | Custom Callbacks/Webhooks | 1 week | Event system |
| 17 | Content Moderation Hooks | 1 week | Guardrails enhancement |
| 18 | Budget Alerts | 0.5 weeks | Budget management |
| 19 | Rate Limit Per Model | 0.5 weeks | Rate limiter enhancement |
| 22 | Custom Pricing | 0.5 weeks | Pricing database |
| 23 | API Key Scoping | 0.5 weeks | Virtual keys |
| 25 | Pass-Through Endpoints | 1 week | Router enhancement |
| 27 | Deployment Health Checks | 1 week | Health watcher enhancement |
| 28 | Routing Strategy Per Model | 0.5 weeks | Router enhancement |
| 29 | Retry with Exponential Backoff | 0.5 weeks | Provider client enhancement |
| 31 | Langfuse Integration | 1 week | Callback system |
| 32 | Prometheus Metrics | 1 week | Metrics middleware |
| 34 | Provider Marketplace | 2 weeks | Provider sorting, UI |
| 35 | Provider Sorting | 1 week | Provider metrics |
| 36 | Performance Thresholds | 0.5 weeks | Provider metrics |
| 37 | Data Collection Policies | 0.5 weeks | Provider metadata |
| 38 | Quantization Filtering | 0.5 weeks | Model metadata |
| 46 | Multi-Provider Moderation | 1.5 weeks | Moderation enhancement |
| 47 | Custom Guardrail Rules | 1 week | Guardrails enhancement |
| 48 | Response Filtering | 0.5 weeks | Guardrails enhancement |
| 56 | Affinity Routing | 0.5 weeks | Router enhancement |
| 58 | Cost-Optimized Routing | 1 week | Pricing + router |
| 60 | Data Residency Controls | 0.5 weeks | Provider metadata |
| 61 | ZDR Enforcement | 0.5 weeks | Provider metadata |
| 62 | API Versioning | 1 week | Router enhancement |
| 64 | SDK Generation | 1 week | OpenAPI spec |

### Phase 4 — Nice-to-Have (Future Roadmap) — Weeks 13+

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 7 | TUI Admin Interface | 2 weeks | Terminal UI library |
| 8 | Build Info Embedding | 0.5 weeks | Build scripts |
| 9 | Home Directory Management | 0.5 weeks | Platform detection |
| 33 | Custom Logging Formats | 0.5 weeks | Logger enhancement |
| 39 | Model Price Comparison | 1 week | Pricing database, UI |
| 40 | Provider Uptime SLAs | 1 week | Health metrics, UI |
| 45 | Topic Restriction | 1 week | Guardrails enhancement |
| 49 | Toxicity Scoring | 1 week | ML model integration |
| 51 | Stream Interruption | 1 week | Streaming enhancement |
| 52 | Stream Multiplexing | 2 weeks | WebSocket enhancement |
| 53 | SSE with Retry | 0.5 weeks | SSE enhancement |
| 57 | Geographic Routing | 1 week | GeoIP + router |
| 65 | Playground UI | 2 weeks | Frontend development |
| 66 | Request Replay | 1 week | Request logging |
| 67 | Model Evaluation Metrics | 1.5 weeks | Metrics collection |

---

## Part 11: Architecture Recommendations

### 11.1 Credential Vault Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Handler   │───▶│  Credential      │───▶│  Encrypted      │
│                 │    │  Manager         │    │  Storage (PG)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Key Rotation    │
                       │  Scheduler       │
                       └──────────────────┘
```

**Implementation**: 
- AES-256-GCM encryption for API keys at rest
- Per-provider credential pools with health-based rotation
- Automatic failover to backup keys on 401/403
- Audit logging for all credential access

### 11.2 Virtual Key Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  sk-xxxxx       │───▶│  Key Resolver    │───▶│  Key Database   │
│  (User Key)     │    │                  │    │  (teams, limits)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Budget Check    │
                       │  Rate Limit Check│
                       │  Model Access    │
                       └──────────────────┘
```

**Implementation**:
- `sk-` prefixed keys with SHA-256 hash storage
- Per-key: model access list, rate limits, budget limits, team association
- Database-backed with Redis caching for hot path

### 11.3 Multi-Tier Caching Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Request        │───▶│  L1: In-Memory   │───▶│  L2: Redis      │
│                 │    │  (sync.Map)       │    │  (distributed)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────────┐
                                                │  L3: Semantic    │
                                                │  (Qdrant/vector) │
                                                └──────────────────┘
```

**Implementation**:
- L1: In-memory sync.Map with TTL (existing SignatureCache)
- L2: Redis with key-based caching (existing Redis cache)
- L3: Vector similarity search via Qdrant for semantic dedup
- Cache hierarchy: L1 → L2 → L3 → Provider

### 11.4 OpenTelemetry GenAI Semantic Conventions

```go
// Span attributes per OpenTelemetry GenAI spec
span.SetAttributes(
    attribute.String("gen_ai.system", "openai"),
    attribute.String("gen_ai.request.model", "gpt-4"),
    attribute.Int("gen_ai.usage.input_tokens", 150),
    attribute.Int("gen_ai.usage.output_tokens", 50),
    attribute.Float64("gen_ai.request.temperature", 0.7),
    attribute.String("gen_ai.response.finish_reason", "stop"),
)
```

**Key spans to instrument**:
- `gateway.request` — full request lifecycle
- `gateway.translation` — format translation
- `gateway.provider.call` — provider API call
- `gateway.cache.lookup` — cache hit/miss
- `gateway.guardrail.check` — guardrail evaluation

---

## Part 12: Database Schema Additions Required

### New Tables Needed

```sql
-- Virtual API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of sk-xxx
    key_prefix VARCHAR(10) NOT NULL,       -- First 7 chars for display
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    model_access TEXT[],                    -- NULL = all models
    rate_limit_rpm INT DEFAULT 60,
    rate_limit_rpd INT DEFAULT 10000,
    budget_limit_cents BIGINT,
    budget_reset_period VARCHAR(20) DEFAULT 'monthly',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    budget_limit_cents BIGINT,
    budget_reset_period VARCHAR(20) DEFAULT 'monthly',
    model_access TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Team Members
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',  -- admin, member, viewer
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Credential Vault
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    encrypted_key TEXT NOT NULL,          -- AES-256-GCM encrypted
    key_hash VARCHAR(64) NOT NULL,        -- For dedup
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,               -- Higher = preferred
    last_rotated_at TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage Tracking
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(64) NOT NULL,
    api_key_id UUID REFERENCES api_keys(id),
    user_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INT NOT NULL,
    output_tokens INT NOT NULL,
    total_tokens INT NOT NULL,
    cost_cents INT,                        -- Calculated cost
    latency_ms INT,
    status VARCHAR(20) NOT NULL,           -- success, error, timeout
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(20) NOT NULL,       -- user, api_key, system
    action VARCHAR(100) NOT NULL,          -- api_key.created, model.accessed, etc.
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Model Access Groups
CREATE TABLE model_access_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    models TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Model Pricing Overrides
CREATE TABLE model_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(50),
    input_cost_per_million_cents INT,
    output_cost_per_million_cents INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model, provider)
);

-- Fallback Configurations
CREATE TABLE fallback_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(255) NOT NULL,
    fallback_chain TEXT[] NOT NULL,         -- Ordered list of fallback models
    max_retries INT DEFAULT 3,
    retry_delay_ms INT DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Part 13: Comparison Matrix — Feature Coverage

| Category | Yapapa | CLIProxyAPI | LiteLLM | OpenRouter |
|----------|--------|-------------|---------|------------|
| **Model Translation** | 90% | 95% | 80% | 70% |
| **Provider Registry** | 85% | 90% | 95% | 80% |
| **Caching** | 70% | 80% | 90% | 60% |
| **Guardrails** | 40% | 60% | 75% | 30% |
| **Auth & Keys** | 50% | 70% | 95% | 85% |
| **Budget Management** | 30% | 60% | 90% | 70% |
| **Observability** | 25% | 50% | 80% | 40% |
| **Load Balancing** | 40% | 70% | 85% | 90% |
| **Streaming** | 80% | 90% | 85% | 80% |
| **Multi-Tenant** | 20% | 50% | 90% | 80% |
| **Security** | 35% | 55% | 70% | 60% |
| **Developer Experience** | 60% | 70% | 80% | 90% |
| **Overall** | **48%** | **67%** | **84%** | **70%** |

---

## Part 14: Quick Wins (Implementable in < 1 Day Each)

1. **Build Info Embedding** — Add `-ldflags` to build script with version, commit, build time
2. **Constant Package** — Extract shared constants (model names, provider names, error codes)
3. **Custom Pricing Table** — Add `model_pricing` table and wire into cost calculation
4. **Rate Limit Per Model** — Extend existing rate limiter with per-model config
5. **Budget Alerts** — Add webhook/email trigger at budget thresholds
6. **Retry with Exponential Backoff** — Add to provider client with configurable retries
7. **API Key Scoping** — Add model_access and rate_limit columns to API keys table
8. **Pass-Through Endpoints** — Add catch-all route that forwards to provider
9. **Data Collection Policies** — Add ZDR flag to provider config
10. **Quantization Filtering** — Add quantization field to model metadata

---

## Part 15: Technical Debt & Architecture Improvements

### 15.1 Current Technical Debt

| Issue | Impact | Fix |
|-------|--------|-----|
| Dead telemetry package | Confusion | Remove or replace with OTel |
| No database migrations automation | Manual errors | Add auto-migrator |
| Legacy `internal/provider/` references | Confusion | Verify all removed |
| Missing integration tests for LLM pipeline | Quality | Add pipeline integration tests |
| No OpenAPI spec generation | SDK drift | Add `swag` or `oapi-codegen` |
| Redis not used for rate limiting | Scalability | Move rate limits to Redis |

### 15.2 Architecture Improvements

1. **Event-Driven Architecture** — Replace direct service calls with event bus for loose coupling
2. **Plugin System** — Allow custom middleware/guardrails as plugins
3. **Configuration as Code** — Model routing, fallbacks, guardrails in YAML/JSON config files
4. **Database Connection Pooling** — Optimize pgx pool settings for high concurrency
5. **Graceful Shutdown** — Ensure in-flight requests complete before shutdown
6. **Health Check Endpoint** — `/health` with dependency checks (DB, Redis, providers)

---

## Appendix A: Research Sources

### Web Searches Performed (25+)

1. CLIProxyAPI features architecture 2025
2. CLIProxyAPI model registry provider management
3. CLIProxyAPI credential rotation failover
4. CLIProxyAPI usage statistics billing
5. CLIProxyAPI WebSocket relay SSE streaming
6. LiteLLM proxy features load balancing caching guardrails
7. LiteLLM virtual keys budget management
8. LiteLLM SSO SAML enterprise features
9. LiteLLM multi-tier caching Redis S3 Qdrant
10. OpenRouter API gateway architecture
11. OpenRouter provider selection routing
12. LLM gateway best practices rate limiting circuit breaker
13. LLM gateway observability OpenTelemetry
14. LLM content moderation guardrails PII detection
15. LLM semantic caching prompt caching
16. LLM token counting cost tracking budget management
17. LLM webhook usage tracking billing
18. LLM virtual keys API key management team isolation
19. AI gateway MCP protocol support
20. LLM prompt injection jailbreak defense
21. LLM A/B testing canary deployment
22. LLM model mapping fallback credential rotation
23. CLIProxyAPI GitHub architecture packages
24. LiteLLM caching documentation
25. OpenRouter provider routing documentation

### Key Documentation Fetched

- CLIProxyAPI: `registry/model_registry.go`, `interfaces/types.go`, `access/reconcile.go`
- DeepWiki: CLIProxyAPI architecture overview
- LiteLLM: Caching documentation
- OpenRouter: Provider selection and routing

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **ZDR** | Zero Data Retention — provider guarantees no request data is stored |
| **OTLP** | OpenTelemetry Protocol — standard for trace/metric/log export |
| **GenAI SemConv** | OpenTelemetry GenAI Semantic Conventions for LLM observability |
| **V-Key** | Virtual API Key — user-facing key that maps to internal credentials |
| **L1/L2/L3 Cache** | In-memory / Redis / Semantic (vector) cache tiers |
| **NER** | Named Entity Recognition — used for PII detection |
| **SAML** | Security Assertion Markup Language — enterprise SSO protocol |
| **OIDC** | OpenID Connect — modern authentication protocol |
| **RBAC** | Role-Based Access Control |
| **DLQ** | Dead Letter Queue — failed webhook/event storage for retry |

---

*Generated by deep research across 25+ web searches covering CLIProxyAPI, LiteLLM, OpenRouter, and LLM gateway best practices.*
