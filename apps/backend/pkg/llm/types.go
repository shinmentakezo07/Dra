package llm

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"
)

// Role represents a message role in a conversation.
type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

// ContentType represents the type of content block.
type ContentType string

const (
	ContentTypeText     ContentType = "text"
	ContentTypeThinking ContentType = "thinking"
	ContentTypeImage    ContentType = "image"
	ContentTypeToolUse  ContentType = "tool_use"
	ContentTypeToolResult ContentType = "tool_result"
)

// FinishReason represents why a completion finished.
type FinishReason string

const (
	FinishReasonStop          FinishReason = "stop"
	FinishReasonLength        FinishReason = "length"
	FinishReasonToolCalls     FinishReason = "tool_calls"
	FinishReasonContentFilter FinishReason = "content_filter"
	FinishReasonEndTurn       FinishReason = "end_turn"
)

// Message represents a unified chat message.
type Message struct {
	Role       Role           `json:"role"`
	Content    string         `json:"content,omitempty"`
	ContentBlocks []ContentBlock `json:"content_blocks,omitempty"`
	ToolCalls  []ToolCall     `json:"tool_calls,omitempty"`
	ToolCallID string         `json:"tool_call_id,omitempty"`
	Name       string         `json:"name,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// ContentBlock represents a structured content block.
type ContentBlock struct {
	Type     ContentType `json:"type"`
	Text     string      `json:"text,omitempty"`
	Thinking string      `json:"thinking,omitempty"`
	ImageURL *ImageURL   `json:"image_url,omitempty"`
	ToolUse  *ToolUse    `json:"tool_use,omitempty"`
	ToolResult *ToolResult `json:"tool_result,omitempty"`
}

// ImageURL represents an image reference.
type ImageURL struct {
	URL    string `json:"url"`
	Detail string `json:"detail,omitempty"`
}

// ToolUse represents a tool invocation.
type ToolUse struct {
	ID    string          `json:"id"`
	Name  string          `json:"name"`
	Input json.RawMessage `json:"input"`
}

// ToolResult represents the result of a tool invocation.
type ToolResult struct {
	ToolUseID string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

// ToolCall represents a tool call in a message.
type ToolCall struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Function ToolCallFunction `json:"function"`
}

// ToolCallFunction represents the function details of a tool call.
type ToolCallFunction struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

// ToolDefinition defines a tool available to the model.
type ToolDefinition struct {
	Type     string      `json:"type"`
	Function ToolFunction `json:"function,omitempty"`
}

// ToolFunction defines a function tool.
type ToolFunction struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

// ThinkingConfig configures reasoning/thinking behavior.
type ThinkingConfig struct {
	Enabled         bool   `json:"enabled"`
	BudgetTokens    int    `json:"budget_tokens,omitempty"`
	ShowThinking    bool   `json:"show_thinking,omitempty"`
}

// ChatRequest is the unified chat completion request.
type ChatRequest struct {
	Model           string           `json:"model"`
	Messages        []Message        `json:"messages"`
	Temperature     *float64         `json:"temperature,omitempty"`
	MaxTokens       *int             `json:"max_tokens,omitempty"`
	TopP            *float64         `json:"top_p,omitempty"`
	TopK            *int             `json:"top_k,omitempty"`
	Stream          bool             `json:"stream"`
	System          string           `json:"system,omitempty"`
	Tools           []ToolDefinition `json:"tools,omitempty"`
	ToolChoice      string           `json:"tool_choice,omitempty"`
	ResponseFormat  *ResponseFormat  `json:"response_format,omitempty"`
	Thinking        *ThinkingConfig  `json:"thinking,omitempty"`
	StopSequences   []string         `json:"stop,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// ResponseFormat configures structured output.
type ResponseFormat struct {
	Type       string          `json:"type"`
	JSONSchema json.RawMessage `json:"json_schema,omitempty"`
}

// Usage represents token usage for a request.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
	ThinkingTokens   int `json:"thinking_tokens,omitempty"`
}

// ChatResponse is the unified non-streaming chat response.
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

// Choice represents a completion choice.
type Choice struct {
	Index        int          `json:"index"`
	Message      Message      `json:"message"`
	FinishReason FinishReason `json:"finish_reason"`
	Delta        *Message     `json:"delta,omitempty"`
}

// StreamChunk is a single chunk from a streaming response.
type StreamChunk struct {
	ID           string       `json:"id"`
	Object       string       `json:"object"`
	Created      int64        `json:"created"`
	Model        string       `json:"model"`
	Provider     string       `json:"provider"`
	Index        int          `json:"index"`
	Delta        Message      `json:"delta"`
	FinishReason *FinishReason `json:"finish_reason,omitempty"`
	Usage        *Usage       `json:"usage,omitempty"`
	Thinking     string       `json:"thinking,omitempty"`
}

// ModelInfo describes an available model.
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
	Status           string   `json:"status,omitempty"`
}

// Provider is the interface for AI backends.
type Provider interface {
	Name() string
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)
	ListModels(ctx context.Context) ([]ModelInfo, error)
	SupportsThinking() bool
}

// ClientOption configures the unified LLM client.
type ClientOption func(*Client)

// Pipeline is the request/response processing pipeline interface.
type Pipeline interface {
	RunBefore(ctx context.Context, req *ChatRequest) error
	RunAfter(ctx context.Context, req *ChatRequest, resp *ChatResponse) error
}

// Watcher handles errors and events from LLM operations.
type Watcher interface {
	HandleError(ctx context.Context, err error)
	EmitEvent(ctx context.Context, event string, data map[string]interface{})
}

// Client is the unified LLM client that works with any provider.
type Client struct {
	provider Provider
	cache    Cache
	pipeline Pipeline
	watcher  Watcher
}

// NewClient creates a new unified LLM client.
func NewClient(provider Provider, opts ...ClientOption) *Client {
	c := &Client{
		provider: provider,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// WithCache sets the cache for the client.
func WithCache(cache Cache) ClientOption {
	return func(c *Client) {
		c.cache = cache
	}
}

// WithPipeline sets the pipeline for the client.
func WithPipeline(p Pipeline) ClientOption {
	return func(c *Client) {
		c.pipeline = p
	}
}

// WithWatcher sets the watcher for the client.
func WithWatcher(w Watcher) ClientOption {
	return func(c *Client) {
		c.watcher = w
	}
}

// Chat sends a chat completion request.
func (c *Client) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if c.pipeline != nil {
		if err := c.pipeline.RunBefore(ctx, req); err != nil {
			return nil, err
		}
	}

	if c.cache != nil && !req.Stream {
		key := CacheKey(req)
		if cached, err := c.cache.Get(ctx, key); err == nil && cached != nil {
			return cached, nil
		}
	}

	resp, err := c.provider.Chat(ctx, req)
	if err != nil {
		if c.watcher != nil {
			c.watcher.HandleError(ctx, err)
		}
		return nil, err
	}

	if c.cache != nil && !req.Stream {
		key := CacheKey(req)
		if err := c.cache.Set(ctx, key, resp, 5*time.Minute); err != nil {
			slog.Warn("cache_write_failed", "key", key, "error", err.Error())
		}
	}

	if c.pipeline != nil {
		if err := c.pipeline.RunAfter(ctx, req, resp); err != nil {
			return nil, err
		}
	}

	return resp, nil
}

// ChatStream sends a streaming chat request.
func (c *Client) ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error) {
	if c.pipeline != nil {
		if err := c.pipeline.RunBefore(ctx, req); err != nil {
			return nil, err
		}
	}

	ch, err := c.provider.ChatStream(ctx, req)
	if err != nil {
		if c.watcher != nil {
			c.watcher.HandleError(ctx, err)
		}
		return nil, err
	}

	return ch, nil
}

// ListModels returns available models from the provider.
func (c *Client) ListModels(ctx context.Context) ([]ModelInfo, error) {
	return c.provider.ListModels(ctx)
}

// Provider returns the underlying provider name.
func (c *Client) Provider() string {
	return c.provider.Name()
}

// SupportsThinking returns whether the provider supports thinking.
func (c *Client) SupportsThinking() bool {
	return c.provider.SupportsThinking()
}

// Cache is the interface for LLM response caching.
type Cache interface {
	Get(ctx context.Context, key string) (*ChatResponse, error)
	Set(ctx context.Context, key string, value *ChatResponse, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Clear(ctx context.Context) error
}
