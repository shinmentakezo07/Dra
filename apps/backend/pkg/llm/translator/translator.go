package translator

import (
	"encoding/json"
	"fmt"
	"strings"

	"dra-platform/backend/pkg/llm"
)

// Direction represents the translation direction.
type Direction int

const (
	AnthropicToOpenAI Direction = iota
	OpenAIToAnthropic
)

// Translator converts between provider-specific request/response formats.
type Translator interface {
	Direction() Direction
	TranslateRequest(req *llm.ChatRequest) (map[string]interface{}, error)
	TranslateResponse(body []byte, model, provider string) (*llm.ChatResponse, error)
	TranslateStreamChunk(data []byte, model, provider string) (*llm.StreamChunk, error)
}

// TranslatorFunc is a raw-bytes translation function for init()-based registration.
// It takes raw JSON input and returns translated raw JSON output.
type TranslatorFunc func(body []byte, model string, stream bool) []byte

// translatorEntry holds a registered translator pair.
type translatorEntry struct {
	// Key is "from:to" (e.g., "openai:anthropic")
	key string
	// Fn is the raw-bytes translation function
	Fn TranslatorFunc
}

// globalRegistry is the init()-based self-registration registry.
// Translator packages register themselves via init() -> RegisterTranslator().
var globalRegistry []translatorEntry

// RegisterTranslator registers a translator for a from->to format pair.
// Called from init() functions in translator sub-packages.
// Example: RegisterTranslator("openai", "anthropic", translateOpenAIToAnthropic)
func RegisterTranslator(from, to string, fn TranslatorFunc) {
	key := strings.ToLower(from) + ":" + strings.ToLower(to)
	globalRegistry = append(globalRegistry, translatorEntry{key: key, Fn: fn})
}

// GetTranslatorFunc returns a raw-bytes translator for the given format pair.
// Returns nil if no translator is registered.
func GetTranslatorFunc(from, to string) TranslatorFunc {
	key := strings.ToLower(from) + ":" + strings.ToLower(to)
	for _, entry := range globalRegistry {
		if entry.key == key {
			return entry.Fn
		}
	}
	return nil
}

// HasTranslator returns true if a translator exists for the given format pair.
func HasTranslator(from, to string) bool {
	return GetTranslatorFunc(from, to) != nil
}

// ListTranslators returns all registered translator keys.
func ListTranslators() []string {
	keys := make([]string, len(globalRegistry))
	for i, entry := range globalRegistry {
		keys[i] = entry.key
	}
	return keys
}

// Registry holds available translators (struct-based, for backward compatibility).
type Registry struct {
	translators map[Direction]Translator
}

// NewRegistry creates a new translator registry.
func NewRegistry() *Registry {
	return &Registry{
		translators: make(map[Direction]Translator),
	}
}

// Register registers a struct-based translator.
func (r *Registry) Register(t Translator) {
	r.translators[t.Direction()] = t
}

// Get retrieves a translator by direction.
func (r *Registry) Get(dir Direction) (Translator, bool) {
	t, ok := r.translators[dir]
	return t, ok
}

// DefaultRegistry returns a registry with all built-in translators.
func DefaultRegistry() *Registry {
	reg := NewRegistry()
	reg.Register(NewAnthropicToOpenAI())
	reg.Register(NewOpenAIToAnthropic())
	return reg
}

// BaseTranslator provides common translation utilities.
type BaseTranslator struct{}

// BuildOpenAIMessages converts llm.Messages to OpenAI message format.
func (bt *BaseTranslator) BuildOpenAIMessages(messages []llm.Message, system string) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(messages)+1)

	if system != "" {
		result = append(result, map[string]interface{}{
			"role":    "system",
			"content": system,
		})
	}

	for _, m := range messages {
		if m.Role == llm.RoleSystem {
			continue
		}

		msg := map[string]interface{}{
			"role":    string(m.Role),
			"content": m.Content,
		}

		// Handle tool calls
		if len(m.ToolCalls) > 0 {
			calls := make([]map[string]interface{}, len(m.ToolCalls))
			for i, tc := range m.ToolCalls {
				calls[i] = map[string]interface{}{
					"id":   tc.ID,
					"type": tc.Type,
					"function": map[string]interface{}{
						"name":      tc.Function.Name,
						"arguments": string(tc.Function.Arguments),
					},
				}
			}
			msg["tool_calls"] = calls
		}

		if m.ToolCallID != "" {
			msg["tool_call_id"] = m.ToolCallID
		}

		result = append(result, msg)
	}

	return result
}

// BuildAnthropicMessages converts llm.Messages to Anthropic message format.
func (bt *BaseTranslator) BuildAnthropicMessages(messages []llm.Message) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(messages))

	for _, m := range messages {
		if m.Role == llm.RoleSystem {
			continue
		}

		role := string(m.Role)
		if role == "assistant" {
			role = "assistant"
		}

		msg := map[string]interface{}{
			"role": role,
		}

		// Handle tool calls and tool results
		if len(m.ToolCalls) > 0 {
			content := make([]map[string]interface{}, 0)
			if m.Content != "" {
				content = append(content, map[string]interface{}{
					"type": "text",
					"text": m.Content,
				})
			}
			for _, tc := range m.ToolCalls {
				content = append(content, map[string]interface{}{
					"type": "tool_use",
					"id":   tc.ID,
					"name": tc.Function.Name,
					"input": rawMessageToInterface(tc.Function.Arguments),
				})
			}
			msg["content"] = content
		} else if m.ToolCallID != "" {
			msg["content"] = []map[string]interface{}{
				{
					"type":        "tool_result",
					"tool_use_id": m.ToolCallID,
					"content":     m.Content,
				},
			}
		} else {
			msg["content"] = m.Content
		}

		result = append(result, msg)
	}

	return result
}

// ExtractOpenAIContent extracts content from an OpenAI-style response.
func (bt *BaseTranslator) ExtractOpenAIContent(body []byte) (string, llm.Usage, llm.FinishReason, error) {
	var resp struct {
		Choices []struct {
			Message struct {
				Role       string `json:"role"`
				Content    string `json:"content"`
				ToolCalls  []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", llm.Usage{}, "", fmt.Errorf("decode openai response: %w", err)
	}

	content := ""
	finishReason := llm.FinishReasonStop
	if len(resp.Choices) > 0 {
		content = resp.Choices[0].Message.Content
		finishReason = llm.FinishReason(resp.Choices[0].FinishReason)
		if finishReason == "" {
			finishReason = llm.FinishReasonStop
		}
	}

	usage := llm.Usage{
		PromptTokens:     resp.Usage.PromptTokens,
		CompletionTokens: resp.Usage.CompletionTokens,
		TotalTokens:      resp.Usage.TotalTokens,
	}

	return content, usage, finishReason, nil
}

// ExtractAnthropicContent extracts content from an Anthropic-style response.
func rawMessageToInterface(raw json.RawMessage) interface{} {
	if len(raw) == 0 {
		return map[string]interface{}{}
	}
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return map[string]interface{}{}
	}
	return v
}

func (bt *BaseTranslator) ExtractAnthropicContent(body []byte) (string, string, llm.Usage, llm.FinishReason, error) {
	var resp struct {
		Content []struct {
			Type           string          `json:"type"`
			Text           string          `json:"text"`
			Thinking       string          `json:"thinking"`
			PartialThinking string         `json:"partial_thinking"`
			Signature      string          `json:"signature"`
			Id             string          `json:"id"`
			Name           string          `json:"name"`
			Input          json.RawMessage `json:"input"`
		} `json:"content"`
		Usage struct {
			InputTokens        int `json:"input_tokens"`
			OutputTokens       int `json:"output_tokens"`
			ThinkingTokens     int `json:"thinking_tokens,omitempty"`
			InputTokensDetails struct {
				CacheReadTokens int `json:"cache_read_tokens,omitempty"`
			} `json:"input_tokens_details,omitempty"`
		} `json:"usage"`
		StopReason string `json:"stop_reason"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", "", llm.Usage{}, "", fmt.Errorf("decode anthropic response: %w", err)
	}

	var contentParts []string
	var thinkingParts []string
	for _, c := range resp.Content {
		switch c.Type {
		case "text":
			contentParts = append(contentParts, c.Text)
		case "thinking":
			thinkingParts = append(thinkingParts, c.Thinking)
		case "partial_thinking":
			thinkingParts = append(thinkingParts, c.PartialThinking)
		case "tool_use":
			// Tool calls are handled separately
		}
	}

	usage := llm.Usage{
		PromptTokens:     resp.Usage.InputTokens,
		CompletionTokens: resp.Usage.OutputTokens,
		TotalTokens:      resp.Usage.InputTokens + resp.Usage.OutputTokens,
		ThinkingTokens:   resp.Usage.ThinkingTokens,
	}

	finishReason := llm.FinishReason(resp.StopReason)
	if finishReason == "" {
		finishReason = llm.FinishReasonEndTurn
	}

	return strings.Join(contentParts, ""), strings.Join(thinkingParts, ""), usage, finishReason, nil
}
