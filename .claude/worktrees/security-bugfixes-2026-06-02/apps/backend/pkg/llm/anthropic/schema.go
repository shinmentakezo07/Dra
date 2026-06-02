package anthropic

import "encoding/json"

// ----- Request types -----

// MessageRequest is an Anthropic Messages API request.
type MessageRequest struct {
	Model         string          `json:"model"`
	Messages      []Message       `json:"messages"`
	System        string          `json:"system,omitempty"`
	MaxTokens     int             `json:"max_tokens"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	StopSequences []string        `json:"stop_sequences,omitempty"`
	Stream        bool            `json:"stream,omitempty"`
	Temperature   *float64        `json:"temperature,omitempty"`
	TopP          *float64        `json:"top_p,omitempty"`
	TopK          *int            `json:"top_k,omitempty"`
	Tools         []ToolDef       `json:"tools,omitempty"`
	ToolChoice    json.RawMessage `json:"tool_choice,omitempty"`
	Thinking      *ThinkingConfig `json:"thinking,omitempty"`
}

// Message is a single message in the conversation.
type Message struct {
	Role    string          `json:"role"`
	Content json.RawMessage `json:"content"` // string or []ContentBlock
	Name    string          `json:"name,omitempty"`
}

// ContentBlock is a structured content block.
type ContentBlock struct {
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	Image *Image `json:"image,omitempty"`

	// For tool_use
	ID    string          `json:"id,omitempty"`
	Name  string          `json:"name,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`

	// For tool_result
	ToolUseID string `json:"tool_use_id,omitempty"`
	Content   string `json:"content,omitempty"`
	IsError   bool   `json:"is_error,omitempty"`
}

// Image represents an image in a content block.
type Image struct {
	Type   string      `json:"type"`
	Source ImageSource `json:"source"`
}

// ImageSource represents the image data.
type ImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

// ToolDef defines a tool for the model.
type ToolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
}

// ThinkingConfig configures extended thinking.
type ThinkingConfig struct {
	Type         string `json:"type"`
	BudgetTokens int    `json:"budget_tokens"`
}

// ----- Response types -----

// MessageResponse is an Anthropic Messages API response.
type MessageResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ResponseBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason,omitempty"`
	StopSequence string         `json:"stop_sequence,omitempty"`
	Usage        Usage          `json:"usage"`
}

// ResponseBlock is a single content block in the response.
type ResponseBlock struct {
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	ID    string `json:"id,omitempty"`
	Name  string `json:"name,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`
	Thinking string `json:"thinking,omitempty"`
	Signature string `json:"signature,omitempty"`
}

// Usage represents token usage.
type Usage struct {
	InputTokens        int `json:"input_tokens"`
	OutputTokens       int `json:"output_tokens"`
	ThinkingTokens     int `json:"thinking_tokens,omitempty"`
	CacheReadTokens    int `json:"cache_read_tokens,omitempty"`
	CacheCreationTokens int `json:"cache_creation_tokens,omitempty"`
}

// ----- Streaming types -----

// StreamEvent is an SSE event sent during streaming.
type StreamEvent struct {
	Type  string          `json:"type"`
	Index int             `json:"index,omitempty"`
	ContentBlock *ResponseBlock `json:"content_block,omitempty"`
	Delta         *StreamDelta  `json:"delta,omitempty"`
	Message       *MessageResponse `json:"message,omitempty"`
	Usage         *Usage        `json:"usage,omitempty"`
}

// StreamDelta represents the delta in a stream event.
type StreamDelta struct {
	Type           string `json:"type"`
	Text           string `json:"text,omitempty"`
	Thinking       string `json:"thinking,omitempty"`
	PartialThinking string `json:"partial_thinking,omitempty"`
	StopReason     string `json:"stop_reason,omitempty"`
	StopSequence   string `json:"stop_sequence,omitempty"`
}

// ErrorResponse is an Anthropic API error.
type ErrorResponse struct {
	Type  string      `json:"type"`
	Error ErrorDetail `json:"error"`
}

// ErrorDetail describes an API error.
type ErrorDetail struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
