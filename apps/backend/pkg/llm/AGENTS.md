# LLM SDK — Provider Registry, Pipeline & Tools

The LLM pipeline processes AI requests through ordered stages: provider resolution → routing → caching → guardrails → moderation → telemetry.

## Pipeline stages (in order)

1. **Validator** — Request schema validation
2. **Router** — Model → provider mapping (includes A/B testing via `router.ABRouter`)
3. **Cache** — Response cache (TTL-based, semantic dedup, LLM response cache)
4. **Guardrails** — Input/output safety checks
5. **Moderation** — Content moderation filtering
6. **Translator** — Format translation (Anthropic ↔ OpenAI ↔ Generic)
7. **Provider** — Actual API call with key rotation + fallback
8. **Telemetry** — Spans, metrics, structured logging
9. **CircuitBreaker** — Provider fault isolation
10. **Watcher** — Error observation & retry

## Subpackage map

| Package           | Role                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `provider/`       | Provider registry (OpenAI SDK integration, key rotation, health check, fallback) |
| `router/`         | Model-to-provider routing                                                        |
| `cache/`          | LLM response cache + semantic dedup + TTL-based cache                            |
| `pipeline/`       | Middleware chain orchestrating stages                                            |
| `translator/`     | Format conversion between Anthropic, OpenAI, Generic                             |
| `tools/`          | Tool/function calling definitions (including `websearch/`)                       |
| `guardrails/`     | Input/output guardrail checks                                                    |
| `moderation/`     | Content filtering                                                                |
| `validator/`      | Request validation                                                               |
| `watcher/`        | Error watcher & retry                                                            |
| `telemetry/`      | OpenTelemetry spans                                                              |
| `tokens/`         | Token counting & limits                                                          |
| `context/`        | Context window management                                                        |
| `embeddings/`     | Embedding generation & search                                                    |
| `batch/`          | Batch request processing                                                         |
| `openai/`         | OpenAI-compatible request building                                               |
| `circuitbreaker/` | Provider circuit breaker                                                         |
| `sdk.go`          | High-level facade                                                                |

## Provider pattern

Each provider in `provider/` implements a common interface with:

- Primary + secondary API key rotation
- Health check endpoint
- Fallback to next provider on failure
- OpenAI SDK integration (`sashabaranov/go-openai`)

## Key files

| Path                   | Role                                         |
| ---------------------- | -------------------------------------------- |
| `sdk.go`               | Main facade — entry point for LLM operations |
| `pipeline/pipeline.go` | Middleware chain orchestrator                |
| `provider/provider.go` | Provider registry                            |
| `router/router.go`     | Model routing logic                          |
| `translator/handler/`  | Translation handlers per format              |
