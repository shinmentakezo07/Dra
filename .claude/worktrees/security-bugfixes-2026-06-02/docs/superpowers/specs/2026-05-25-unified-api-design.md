# Unified LLM Gateway Endpoint — Design Spec

## Problem

Two separate HTTP handlers (`OpenAIChatCompletions` and `AnthropicMessages`) duplicate ~80% of their logic (auth, sandbox detection, model routing, balance checks, billing). Each uses its own converter package, and the `pkg/llm/translator/` package (a third conversion layer) is dead code at the handler level. Streaming tool calls are silently dropped in both directions.

## Goal

A single unified handler for `/v1/chat/completions` that auto-detects input format (OpenAI vs Anthropic), converts to internal `llm.ChatRequest`, routes to any provider, and converts the response back to the detected format. `/v1/messages` becomes a thin alias.

## Architecture

### Request Flow

```
Client → /v1/chat/completions → Format Detection → ToInternalRequest → Provider Service → FromInternalResponse → Format Response → Client
                                    ↑                                                                         ↑
                              OpenAI or Anthropic                                                    Same as input (or X-Output-Format override)
```

### Format Detection (`pkg/llm/format/detect.go`)

New package. Inspects raw JSON body to determine format:

- **Anthropic indicators**: top-level `"system"` field, `"anthropic_version"` field, messages with array-type `"content"` blocks containing `"type"` fields like `"text"`, `"image"`, `"tool_use"`, `"tool_result"`, `X-Output-Format: anthropic` header, or `anthropic-beta` header
- **OpenAI indicators** (default): `"messages"` with string `"content"` or OpenAI-style content parts (`"type": "text"` with `"text"` field, `"type": "image_url"`), no top-level `"system"`
- **Fallback**: OpenAI (industry standard, most clients default to it)

Returns `FormatOpenAI` or `FormatAnthropic`.

### Unified Handler (`internal/handler/unified_chat.go`)

Replaces both `openai_proxy.go:OpenAIChatCompletions` and `anthropic_messages.go:AnthropicMessages`. Steps:

1. Read body bytes (for format detection + later parsing)
2. Detect format via `format.Detect()`
3. Parse into format-specific request struct
4. Convert to `llm.ChatRequest` using existing `openai.ToInternalRequest()` or `anthropic.ToInternalRequest()`
5. Resolve model aliases
6. Model routing (modelRouter, abRouter)
7. Balance check + budget routing
8. If stream: route to unified stream handler; else: route to unified non-stream handler
9. Convert response back using `FromInternalResponse` for detected format
10. If `X-Output-Format` header differs from input format, re-convert through the other converter

### `/v1/messages` Alias

Kept as a thin handler that sets a flag/header to force Anthropic format detection, then delegates to the same unified logic. This preserves backward compatibility for Anthropic SDK users.

### Bug Fixes

1. **Streaming tool calls in OpenAI formatter** (`pkg/llm/openai/formatter.go:FromInternalStreamChunk`): Add `ToolCalls` field mapping from `StreamChunk.Delta.ToolCalls` to OpenAI's streaming `delta.tool_calls` format
2. **Streaming tool calls in Anthropic formatter** (`pkg/llm/anthropic/formatter.go:FromInternalStreamChunk`): Add `tool_use` content block handling with `content_block_start`/`content_block_delta`/`content_block_stop` events
3. **Metadata mapping** (`pkg/llm/anthropic/formatter.go:ToInternalRequest`): Map `req.Metadata` to `internal.Metadata`
4. **Dead `model` parameter** in `anthropic_to_openai.go`: Remove unused parameter

### Files to Create

| File                                    | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `pkg/llm/format/detect.go`              | Format auto-detection from raw JSON body         |
| `pkg/llm/format/detect_test.go`         | Tests for format detection                       |
| `internal/handler/unified_chat.go`      | Unified handler replacing both separate handlers |
| `internal/handler/unified_chat_test.go` | Tests for unified handler                        |

### Files to Modify

| File                             | Change                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `pkg/llm/openai/formatter.go`    | Add streaming tool call support in `FromInternalStreamChunk`                 |
| `pkg/llm/anthropic/formatter.go` | Add streaming tool use events, map Metadata field                            |
| `cmd/api/routes.go`              | Wire unified handler to `/v1/chat/completions`, make `/v1/messages` an alias |

### Files to Delete

| File                                     | Reason                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `pkg/llm/translator/` (entire directory) | Dead code at handler level, has bugs, duplicates existing converters |

### What Stays Unchanged

- `pkg/llm/openai/` — OpenAI format converter (with bug fixes)
- `pkg/llm/anthropic/` — Anthropic format converter (with bug fixes)
- `internal/handler/openai_proxy.go` — Keep `OpenAIEmbeddings`, `OpenAIListModels`, `writeOpenAIError`
- `internal/handler/anthropic_messages.go` — Keep `writeAnthropicError` (shared error helper)
- Provider layer usage of translators (inside `AnthropicProvider`) — separate concern

## Testing

- Format detection: unit tests for both formats, edge cases (empty body, malformed JSON)
- Unified handler: integration tests for both input formats, streaming and non-streaming
- Streaming tool calls: verify tool_use blocks appear in both OpenAI and Anthropic streaming output
- Backward compat: verify `/v1/messages` still works for existing Anthropic SDK clients
