# LLM Pipeline — Complete Reference

The LLM pipeline at `pkg/llm/` processes AI requests through 10 ordered stages across 19 subpackages. This document provides source-level detail of every component.

---

## Core Types (`pkg/llm/types.go`)

### Provider Interface

```go
type Provider interface {
    Name() string
    Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
    ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)
    ListModels(ctx context.Context) ([]ModelInfo, error)
    SupportsThinking() bool
}
```

### Role and Content Types

```go
type Role string
const (
    RoleSystem    Role = "system"
    RoleUser      Role = "user"
    RoleAssistant Role = "assistant"
    RoleTool      Role = "tool"
)

type ContentType string
const (
    ContentTypeText       ContentType = "text"
    ContentTypeThinking   ContentType = "thinking"
    ContentTypeImage      ContentType = "image"
    ContentTypeToolUse    ContentType = "tool_use"
    ContentTypeToolResult ContentType = "tool_result"
)

type FinishReason string
const (
    FinishReasonStop          FinishReason = "stop"
    FinishReasonLength        FinishReason = "length"
    FinishReasonToolCalls     FinishReason = "tool_calls"
    FinishReasonContentFilter FinishReason = "content_filter"
    FinishReasonEndTurn       FinishReason = "end_turn"
)
```

### Message Structures

```go
type Message struct {
    Role          Role           `json:"role"`
    Content       string         `json:"content,omitempty"`
    ContentBlocks []ContentBlock `json:"content_blocks,omitempty"`
    ToolCalls     []ToolCall     `json:"tool_calls,omitempty"`
    ToolCallID    string         `json:"tool_call_id,omitempty"`
    Name          string         `json:"name,omitempty"`
}

type ContentBlock struct {
    Type       ContentType `json:"type"`
    Text       string      `json:"text,omitempty"`
    Thinking   string      `json:"thinking,omitempty"`
    ImageURL   *ImageURL   `json:"image_url,omitempty"`
    ToolUse    *ToolUse    `json:"tool_use,omitempty"`
    ToolResult *ToolResult `json:"tool_result,omitempty"`
}

type ImageURL struct {
    URL    string `json:"url"`
    Detail string `json:"detail,omitempty"`
}
```

### ChatRequest

```go
type ChatRequest struct {
    Model          string             `json:"model"`
    Messages       []Message          `json:"messages"`
    Temperature    *float64           `json:"temperature,omitempty"`
    MaxTokens      *int               `json:"max_tokens,omitempty"`
    TopP           *float64           `json:"top_p,omitempty"`
    TopK           *int               `json:"top_k,omitempty"`
    Stream         bool               `json:"stream"`
    System         string             `json:"system,omitempty"`
    Tools          []ToolDefinition   `json:"tools,omitempty"`
    ToolChoice     string             `json:"tool_choice,omitempty"`
    ResponseFormat *ResponseFormat    `json:"response_format,omitempty"`
    Thinking       *ThinkingConfig    `json:"thinking,omitempty"`
    StopSequences  []string           `json:"stop,omitempty"`
    Metadata       map[string]string  `json:"metadata,omitempty"`
}
```

### ChatResponse / StreamChunk

```go
type ChatResponse struct {
    ID           string       `json:"id"`
    Object       string       `json:"object"`
    Created      int64        `json:"created"`
    Model        string       `json:"model"`
    Provider     string       `json:"provider"`
    Choices      []Choice     `json:"choices"`
    Usage        Usage        `json:"usage"`
    Thinking     string       `json:"thinking,omitempty"`
    FinishReason FinishReason `json:"finish_reason"`
}

type StreamChunk struct {
    ID           string        `json:"id"`
    Object       string        `json:"object"`
    Created      int64         `json:"created"`
    Model        string        `json:"model"`
    Provider     string        `json:"provider"`
    Index        int           `json:"index"`
    Delta        Message       `json:"delta"`
    FinishReason *FinishReason `json:"finish_reason,omitempty"`
    Usage        *Usage        `json:"usage,omitempty"`
    Thinking     string        `json:"thinking,omitempty"`
}

type Usage struct {
    PromptTokens     int `json:"prompt_tokens"`
    CompletionTokens int `json:"completion_tokens"`
    TotalTokens      int `json:"total_tokens"`
    ThinkingTokens   int `json:"thinking_tokens,omitempty"`
}
```

### ModelInfo

```go
type ModelInfo struct {
    ID               string   `json:"id"`
    Name             string   `json:"name"`
    Provider         string   `json:"provider"`
    InputPricePer1k  float64  `json:"input_price_per_1k"`
    OutputPricePer1k float64  `json:"output_price_per_1k"`
    ContextWindow    int      `json:"context_window"`
    Description      string   `json:"description"`
    Capabilities     []string `json:"capabilities"`
    SupportsThinking bool     `json:"supports_thinking"`
    SupportsVision   bool     `json:"supports_vision"`
    SupportsTools    bool     `json:"supports_tools"`
}
```

### Client (Unified Wrapper)

```go
type Client struct {
    provider Provider
    cache    Cache
    pipeline Pipeline
    watcher  Watcher
}

func NewClient(provider Provider, opts ...ClientOption) *Client

// Chat: RunBefore -> cache check -> provider.Chat -> cache set -> RunAfter
func (c *Client) Chat(ctx, req) (*ChatResponse, error)

// ChatStream: RunBefore -> provider.ChatStream (no caching for streams)
func (c *Client) ChatStream(ctx, req) (<-chan StreamChunk, error)
```

### Cache Interface

```go
type Cache interface {
    Get(ctx context.Context, key string) (*ChatResponse, error)
    Set(ctx context.Context, key string, value *ChatResponse, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
    Clear(ctx context.Context) error
    Stats(ctx context.Context) (Stats, error)
}
```

---

## Provider Registry (`pkg/llm/provider/provider.go`)

### BaseProvider

```go
type BaseProvider struct {
    name       string
    apiKey     string
    baseURL    string
    client     *http.Client           // Timeout: 120s
    openaiClient *openai.Client       // sashabaranov/go-openai SDK
    translator translator.Translator
    cache      llm.Cache
    watcher    *watcher.Watcher
    supportsThinking bool
    models     []llm.ModelInfo
}
```

Functional options: `WithAPIKey`, `WithBaseURL`, `WithHTTPClient`, `WithTranslator`, `WithCache`, `WithWatcher`, `WithSupportsThinking`, `WithModels`.

`doRequest()` — HTTP helper that injects `X-Request-ID` header from trace context.

### OpenAIProvider

```go
type OpenAIProvider struct { *BaseProvider }
func NewOpenAIProvider(opts ...Option) *OpenAIProvider
```

- Base URL: `https://api.openai.com/v1`
- SDK: `sashabaranov/go-openai` v1.41.2
- Translator: AnthropicToOpenAI
- SupportsThinking: true

**Static Models** (5):

| ID                 | Name        | Input/1k | Output/1k | Context | Capabilities                         |
| ------------------ | ----------- | -------- | --------- | ------- | ------------------------------------ |
| openai/gpt-4o      | GPT-4o      | $0.0025  | $0.01     | 128K    | text, vision, code, tools            |
| openai/gpt-4o-mini | GPT-4o Mini | $0.00015 | $0.0006   | 128K    | text, vision, tools                  |
| openai/gpt-4.1     | GPT-4.1     | $0.002   | $0.008    | 256K    | text, code, reasoning, vision, tools |
| openai/o3-mini     | o3 Mini     | $0.0011  | $0.0044   | 200K    | text, reasoning, code, tools         |
| openai/o1          | o1          | $0.015   | $0.06     | 200K    | text, reasoning, tools               |

### AnthropicProvider

```go
type AnthropicProvider struct { *BaseProvider }
func NewAnthropicProvider(opts ...Option) *AnthropicProvider
```

- Base URL: `https://api.anthropic.com/v1`
- Auth: `x-api-key` header + `anthropic-version: 2023-06-01`
- Translator: OpenAIToAnthropic
- SupportsThinking: true

**Chat flow**: TranslateRequest -> Marshal -> doRequest POST /messages -> ReadAll -> TranslateResponse -> cache -> return

**ChatStream flow**: TranslateRequest -> add `"stream": true` -> doRequest SSE -> ReadSSE loop -> TranslateStreamChunk per event -> channel

**Static Models** (3):

| ID                                  | Name             | Input/1k | Output/1k | Context |
| ----------------------------------- | ---------------- | -------- | --------- | ------- |
| anthropic/claude-sonnet-4-20250514  | Claude Sonnet 4  | $0.003   | $0.015    | 200K    |
| anthropic/claude-opus-4-20250514    | Claude Opus 4    | $0.015   | $0.075    | 200K    |
| anthropic/claude-3-5-haiku-20241022 | Claude 3.5 Haiku | $0.0008  | $0.004    | 200K    |

### GenericProvider

```go
type GenericProvider struct { *BaseProvider }
func NewGenericProvider(name, baseURL string, opts ...Option) *GenericProvider
```

For any OpenAI-compatible API. Configurable base URLs:

| Provider   | Base URL                                                  |
| ---------- | --------------------------------------------------------- |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1`                     |
| Groq       | `https://api.groq.com/openai/v1`                          |
| Gemini     | `https://generativelanguage.googleapis.com/v1beta/openai` |

**Groq models** (3): llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it

**Gemini models** (3): gemini-2.0-flash, gemini-2.5-pro-preview-03-25, gemini-1.5-flash (all 1M context)

### Registry

```go
type Registry struct {
    mu        sync.RWMutex
    providers map[string]llm.Provider
    models    []llm.ModelInfo   // cached aggregate
}

func NewRegistry() *Registry
func (r *Registry) Register(p llm.Provider)     // thread-safe add, invalidates model cache
func (r *Registry) Get(name string) (llm.Provider, bool)
func (r *Registry) GetByModel(modelID string) (llm.Provider, string, bool)  // parses "provider/model"
func (r *Registry) Providers() []string
func (r *Registry) AllModels(ctx) ([]llm.ModelInfo, error)  // cached
func (r *Registry) RouteRequest(ctx, req) (*llm.ChatResponse, error)
func (r *Registry) RouteStreamRequest(ctx, req) (<-chan llm.StreamChunk, error)
```

Model ID format: `"provider/model-name"` (e.g., `"openai/gpt-4o"`). ParseModelID splits on first `/`.

### SSE Reader

```go
func ReadSSE(r io.Reader, yield func(string) bool)
```

Reads 4KB buffer chunks, splits on `\n`, calls yield() per line. Returns false from yield to stop.

---

## Circuit Breaker (`pkg/llm/circuitbreaker/circuitbreaker.go`)

```go
type State int
const (
    StateClosed   State = iota   // Normal: requests pass through
    StateOpen                    // Fail fast: requests rejected
    StateHalfOpen                // Testing: limited requests allowed
)

type Config struct {
    FailureThreshold int           // default 5
    SuccessThreshold int           // default 2
    Timeout          time.Duration // default 30s
    HalfOpenMaxCalls int           // default 3
}
```

**State Machine**:

```
Closed --(5 failures)--> Open --(30s timeout)--> HalfOpen --(2 successes)--> Closed
                                                      |
                                                   (1 failure)
                                                      v
                                                     Open
```

`beforeCall()`: checks state. Open rejects. HalfOpen allows up to HalfOpenMaxCalls.

`recordResult(err)`: transitions state. HalfOpen success increments counter toward Closed.

`wrapStream(ch)`: wraps streaming channel, observes finish_reason=stop as success.

---

## Cache (`pkg/llm/cache/`)

### MemoryCache

```go
type MemoryCache struct {
    mu         sync.RWMutex
    entries    map[string]*Entry
    hits       int64
    misses     int64
    maxSize    int           // default 10000
    defaultTTL time.Duration // default 5m
}

type Entry struct {
    Response    *llm.ChatResponse
    CreatedAt   time.Time
    ExpiresAt   time.Time
    AccessCount int
    Model       string
    Hash        string
}
```

**Eviction**: LFU with LRU tiebreaker. Low-access-count entries evicted first when at capacity.

**Cleanup**: `StartCleanup(interval)` runs periodic expired-entry removal.

**Deep copy**: Responses deep-copied on Get/Set to prevent mutation.

### KeyBuilder

```go
type KeyBuilder struct {
    prefix    string
    separator string   // default ":"
}

func (kb *KeyBuilder) Build(req *ChatRequest) string
```

Cache key = `prefix:model:msgHash16[:systemHash16]:toolHash16:t{T}:m{M}:p{P}`

- Messages: SHA-256 of (role+content+toolCallID), truncated to 16 hex chars
- System: SHA-256 truncated to 16 hex chars
- Tools: SHA-256 of JSON marshal, truncated to 16 hex chars
- Temperature/ MaxTokens/ TopP appended if set

### Additional Caches

| Cache         | File                           | Description                                                |
| ------------- | ------------------------------ | ---------------------------------------------------------- |
| DedupCache    | `dedup.go`                     | Deduplicates identical concurrent requests                 |
| SemanticCache | `semantic.go`                  | In-memory with cosine-similarity matching (threshold 0.92) |
| GoRedisCache  | `redis.go`, `redis_goredis.go` | Redis backend via go-redis v9                              |

---

## Router (`pkg/llm/router/router.go`)

### Strategies

```go
type Strategy int
const (
    StrategyCost       Strategy = iota  // Cheapest capable provider
    StrategyLatency                     // Fastest historical response
    StrategyReliability                 // Lowest error rate
    StrategyCapability                  // Best feature match
    StrategyRandom                      // Random selection
)
```

### Router

```go
type Router struct {
    providers []llm.Provider
    strategy  Strategy
    latencies map[string]*latencyTracker   // 100 samples per provider
    errors    map[string]*errorTracker     // success/failure counts
}
```

**routeByCost**: Queries all providers' model lists, picks cheapest matching model by sum of input+output price.

**routeByLatency**: Running average of last 100 latency samples per provider. New providers default to 500ms.

**routeByReliability**: error_rate = failures / total per provider.

**routeByCapability**: Filters by tool/thinking support requirements.

**routeByRandom**: `rand.Intn(len(candidates))`

### Trackers

LatencyTracker: circular buffer of 100 `time.Duration` samples, RWMutex protected.

ErrorTracker: atomic failure/total counters, RWMutex protected.

### ABRouter

```go
type ABRouter struct { variants map[string]*Variant }

type Variant struct {
    Name       string
    Provider   llm.Provider
    TrafficPct float64   // 0.0 - 1.0
    counter    uint64    // atomic
}
```

Weighted random selection via `rand.Float64()` against cumulative traffic percentage.

### BudgetRouter

Finds cheaper model alternatives when user has insufficient credits for the requested model.

---

## Guardrails (`pkg/llm/guardrails/guardrails.go`)

```go
type Guard struct {
    enabled         bool
    blockedPatterns []*regexp.Regexp    // violence keywords
    piiPatterns     []*regexp.Regexp     // SSN, credit card, email
    promptInjection []string             // 11 known phrases
    maxPromptLength int                  // default 100000
}
```

**Default blocked patterns**: `(?i)\b(attack|kill|murder|bomb|terrorist)\b`

**Default PII patterns**:

- SSN: `\b\d{3}-\d{2}-\d{4}\b`
- Credit card: `\b(?:\d[ -]*?){13,16}\b`
- Email: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`

**Prompt injection phrases** (11): "ignore previous instructions", "ignore all prior instructions", "disregard previous", "you are now", "new instructions:", "system override", "DAN mode", "jailbreak", "ignore the above", "do not follow"

**CheckResult**:

```go
type CheckResult struct {
    Allowed       bool
    Reason        string
    Violations    []string
    PIIDetected   bool
    PIIMasked     string
    InjectionRisk float64    // 0.0 - 1.0
}
```

Risk > 0.5: flagged. Risk > 0.8: blocked. Risk = matches / len(phrases), capped at 1.0.

### SandboxProvider

Mock provider for development. Returns `"[SANDBOX MODE]"` messages. Streaming mimics word-by-word output via goroutine + channel.

---

## Helper Functions (`pkg/llm/helper.go`)

### CacheKey

SHA-256 of: model + system + messages(role+content+toolCallID) + tools(JSON) + temperature + maxTokens + thinking(JSON). Returns hex string.

### Token Estimation

```go
func EstimateTokens(text string) int {
    // Character-based: 4 chars = 1 token
    charEstimate := utf8.RuneCountInString(text) / 4
    // Word-based: 0.75 words = 1 token
    wordEstimate := int(float64(len(words)) * 1.33)
    // Code blocks are denser (1.2x)
    if countCodeBlocks(text) > 0 { wordEstimate *= 1.2 }
    // Average of both heuristics
    return (charEstimate + wordEstimate) / 2
}
```

### Other Helpers

| Function                                       | Description                                         |
| ---------------------------------------------- | --------------------------------------------------- |
| `EstimateMessageTokens(messages)`              | Per-message tokens + 4 overhead + 2 conversation    |
| `EstimateRequestTokens(req)`                   | Messages + system prompt                            |
| `TruncateMessages(messages, maxTokens)`        | Keep system + most recent messages                  |
| `ParseModelID("provider/model")`               | Split on first "/"                                  |
| `ClampTemperature(t)`                          | Clamp to [0, 2]                                     |
| `ClampTopP(p)`                                 | Clamp to [0, 1]                                     |
| `Cost(inTokens, outTokens, inPrice, outPrice)` | USD cost calculation                                |
| `DeepCopyRequest(req)`                         | Full deep copy with nil-safe pointers               |
| `SanitizeContent(s)`                           | Remove null bytes + control characters              |
| `IsVisionModel(model)`                         | Check if model supports vision                      |
| `IsThinkingModel(model)`                       | Check if model supports thinking                    |
| `IsToolModel(model)`                           | Check if model supports tools                       |
| `DefaultMaxTokens(model)`                      | Per-model default (opus/sonnet: 8192, o1/o3: 32768) |

---

## Pipeline Stages (Ordered)

| #   | Stage          | Package                   | What It Does               |
| --- | -------------- | ------------------------- | -------------------------- |
| 1   | Validator      | `pkg/llm/validator/`      | Schema validation          |
| 2   | Router         | `pkg/llm/router/`         | Model-to-provider mapping  |
| 3   | Cache          | `pkg/llm/cache/`          | TTL + semantic dedup check |
| 4   | Guardrails     | `pkg/llm/guardrails/`     | Input/output safety        |
| 5   | Moderation     | `pkg/llm/moderation/`     | Content flagging           |
| 6   | Translator     | `pkg/llm/translator/`     | Format conversion          |
| 7   | Provider       | `pkg/llm/provider/`       | API call with key rotation |
| 8   | Telemetry      | `pkg/llm/telemetry/`      | Spans + logging            |
| 9   | CircuitBreaker | `pkg/llm/circuitbreaker/` | Fault isolation            |
| 10  | Watcher        | `pkg/llm/watcher/`        | Error observation          |

---

## Additional Subpackages

| Package               | Files                                                                           | Description                         |
| --------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `translator/`         | translator.go, anthropic_to_openai.go, openai_to_anthropic.go                   | Bidirectional format conversion     |
| `translator/handler/` | handler.go, batch.go, direction.go, errors.go, middleware.go                    | Directional translation             |
| `moderation/`         | moderation.go                                                                   | Content moderation filtering        |
| `tokens/`             | tokens.go                                                                       | Token counting and limits           |
| `context/`            | compressor.go                                                                   | Context window compression          |
| `embeddings/`         | openai.go, types.go, utils.go, errors.go                                        | Embedding generation                |
| `batch/`              | batch.go                                                                        | Batch request processing            |
| `openai/`             | schema.go, formatter.go, stream_formatter.go                                    | OpenAI request/response building    |
| `anthropic/`          | schema.go, formatter.go                                                         | Anthropic request/response building |
| `tools/`              | builtin.go, executor.go, loop.go, registry.go, result.go, stream.go, websearch/ | Tool calling                        |
| `translate/`          | validate.go, errors.go                                                          | Translation validation              |
| `telemetry/`          | logger.go, span.go                                                              | OpenTelemetry spans                 |
| `watcher/`            | watcher.go                                                                      | Error observation                   |
