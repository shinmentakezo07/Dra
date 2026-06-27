package streaming

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Format represents the output SSE format.
type Format int

const (
	FormatOpenAI Format = iota
	FormatAnthropic
	FormatInternal
)

// StreamWriter writes stream chunks as SSE events in a specific format.
type StreamWriter interface {
	// WriteChunk writes a content delta chunk.
	WriteChunk(chunk *llm.StreamChunk) error

	// WriteToolCallStart writes the start of a tool call (Anthropic: content_block_start).
	WriteToolCallStart(tc *llm.ToolCall) error

	// WriteToolCallDelta writes a tool call argument delta.
	WriteToolCallDelta(index int, argsDelta string) error

	// WriteToolCallEnd writes the end of a tool call.
	WriteToolCallEnd(index int) error

	// WriteThinking writes a thinking/reasoning delta.
	WriteThinking(thinking string) error

	// WriteFinish writes the stream finish event with reason and usage.
	WriteFinish(reason llm.FinishReason, usage *llm.Usage) error

	// WriteError writes a mid-stream error event.
	WriteError(code, message string) error

	// WriteRaw writes raw SSE data (for custom events).
	WriteRaw(event string, data interface{}) error

	// Flush flushes the underlying writer if it supports flushing.
	Flush()

	// Format returns the output format.
	Format() Format
}

// Flusher is an optional interface for flushing buffered data.
type Flusher interface {
	Flush()
}

// SSEWriter is the base SSE writing infrastructure.
type SSEWriter struct {
	mu      sync.Mutex
	w       io.Writer
	flusher Flusher
}

// NewSSEWriter creates a new SSE writer. If w implements Flusher, it will be used.
func NewSSEWriter(w io.Writer) *SSEWriter {
	sw := &SSEWriter{w: w}
	if f, ok := w.(Flusher); ok {
		sw.flusher = f
	}
	return sw
}

// WriteEvent writes a named SSE event.
func (s *SSEWriter) WriteEvent(event string, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if event != "" {
		if _, err := fmt.Fprintf(s.w, "event: %s\n", event); err != nil {
			return err
		}
	}
	_, err := fmt.Fprintf(s.w, "data: %s\n\n", data)
	return err
}

// WriteComment writes an SSE comment (used as keepalive).
func (s *SSEWriter) WriteComment(comment string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := fmt.Fprintf(s.w, ": %s\n\n", comment)
	return err
}

// Flush flushes the underlying writer.
func (s *SSEWriter) Flush() {
	if s.flusher != nil {
		s.flusher.Flush()
	}
}

// Writer returns the underlying io.Writer.
func (s *SSEWriter) Writer() io.Writer {
	return s.w
}

// --- OpenAI format writer ---

// OpenAIStreamWriter writes OpenAI-compatible SSE chunks.
type OpenAIStreamWriter struct {
	sse     *SSEWriter
	model   string
	mu      sync.Mutex
	counter int
}

// NewOpenAIStreamWriter creates a new OpenAI format stream writer.
func NewOpenAIStreamWriter(w io.Writer, model string) *OpenAIStreamWriter {
	return &OpenAIStreamWriter{
		sse:   NewSSEWriter(w),
		model: model,
	}
}

func (f *OpenAIStreamWriter) nextID() string {
	f.counter++
	return fmt.Sprintf("chatcmpl-%d-%d", time.Now().UnixNano(), f.counter)
}

func (f *OpenAIStreamWriter) Format() Format { return FormatOpenAI }

func (f *OpenAIStreamWriter) WriteChunk(chunk *llm.StreamChunk) error {
	if chunk == nil {
		return nil
	}
	out := buildOpenAIChunk(f.nextID(), f.model, chunk.Index, chunk.Delta.Role, chunk.Delta.Content, nil, nil)
	return f.sse.WriteEvent("", marshal(out))
}

func (f *OpenAIStreamWriter) WriteToolCallStart(tc *llm.ToolCall) error {
	if tc == nil {
		return nil
	}
	out := buildOpenAIChunk(f.nextID(), f.model, 0, llm.RoleAssistant, "", &openAIToolCallDelta{
		Index:    0,
		ID:       tc.ID,
		Type:     tc.Type,
		Function: &openAIFunctionDelta{Name: tc.Function.Name},
	}, nil)
	return f.sse.WriteEvent("", marshal(out))
}

func (f *OpenAIStreamWriter) WriteToolCallDelta(index int, argsDelta string) error {
	out := buildOpenAIChunk(f.nextID(), f.model, 0, "", "", &openAIToolCallDelta{
		Index:    index,
		Function: &openAIFunctionDelta{Arguments: argsDelta},
	}, nil)
	return f.sse.WriteEvent("", marshal(out))
}

func (f *OpenAIStreamWriter) WriteToolCallEnd(index int) error {
	return nil // OpenAI doesn't have explicit tool call end events
}

func (f *OpenAIStreamWriter) WriteThinking(thinking string) error {
	// OpenAI uses reasoning_content in the delta for o1/o3 models
	out := map[string]interface{}{
		"id":      f.nextID(),
		"object":  "chat.completion.chunk",
		"created": time.Now().Unix(),
		"model":   f.model,
		"choices": []map[string]interface{}{{
			"index": 0,
			"delta": map[string]interface{}{
				"reasoning_content": thinking,
			},
		}},
	}
	return f.sse.WriteEvent("", marshal(out))
}

func (f *OpenAIStreamWriter) WriteFinish(reason llm.FinishReason, usage *llm.Usage) error {
	reasonStr := string(reason)
	if reasonStr == "" {
		reasonStr = "stop"
	}
	out := buildOpenAIChunk(f.nextID(), f.model, 0, "", "", nil, &reasonStr)
	if usage != nil {
		out["usage"] = map[string]interface{}{
			"prompt_tokens":     usage.PromptTokens,
			"completion_tokens": usage.CompletionTokens,
			"total_tokens":      usage.TotalTokens,
		}
	}
	if err := f.sse.WriteEvent("", marshal(out)); err != nil {
		return err
	}
	_, err := fmt.Fprintf(f.sse.Writer(), "data: [DONE]\n\n")
	return err
}

func (f *OpenAIStreamWriter) WriteError(code, message string) error {
	out := map[string]interface{}{
		"id":      f.nextID(),
		"object":  "chat.completion.chunk",
		"created": time.Now().Unix(),
		"model":   f.model,
		"error":   map[string]interface{}{"code": code, "message": message},
		"choices": []map[string]interface{}{{
			"index":         0,
			"delta":         map[string]interface{}{},
			"finish_reason": "error",
		}},
	}
	return f.sse.WriteEvent("", marshal(out))
}

func (f *OpenAIStreamWriter) WriteRaw(event string, data interface{}) error {
	return f.sse.WriteEvent(event, marshal(data))
}

func (f *OpenAIStreamWriter) Flush() { f.sse.Flush() }

// --- Anthropic format writer ---

// AnthropicStreamWriter writes Anthropic-compatible SSE events.
type AnthropicStreamWriter struct {
	sse        *SSEWriter
	model      string
	streamState *anthropicStreamState
	mu         sync.Mutex
	msgStarted bool
	blockIndex int
}

type anthropicStreamState struct {
	HasTextBlock     bool
	HasThinkingBlock bool
	HasToolUseBlock  bool
}

// NewAnthropicStreamWriter creates a new Anthropic format stream writer.
func NewAnthropicStreamWriter(w io.Writer, model string) *AnthropicStreamWriter {
	return &AnthropicStreamWriter{
		sse:         NewSSEWriter(w),
		model:       model,
		streamState: &anthropicStreamState{},
	}
}

func (f *AnthropicStreamWriter) Format() Format { return FormatAnthropic }

func (f *AnthropicStreamWriter) ensureMessageStart(chunkID string) error {
	if f.msgStarted {
		return nil
	}
	if chunkID == "" {
		chunkID = fmt.Sprintf("msg_%d", time.Now().UnixNano())
	}
	msgStart := map[string]interface{}{
		"type": "message_start",
		"message": map[string]interface{}{
			"id":    chunkID,
			"type":  "message",
			"role":  "assistant",
			"model": f.model,
		},
	}
	f.msgStarted = true
	return f.sse.WriteEvent("message_start", marshal(msgStart))
}

func (f *AnthropicStreamWriter) WriteChunk(chunk *llm.StreamChunk) error {
	if chunk == nil {
		return nil
	}
	if err := f.ensureMessageStart(chunk.ID); err != nil {
		return err
	}

	if chunk.Delta.Content != "" {
		if !f.streamState.HasTextBlock {
			f.streamState.HasTextBlock = true
			startEvent := map[string]interface{}{
				"type":  "content_block_start",
				"index": f.blockIndex,
				"content_block": map[string]interface{}{
					"type": "text",
					"text": "",
				},
			}
			if err := f.sse.WriteEvent("content_block_start", marshal(startEvent)); err != nil {
				return err
			}
		}
		deltaEvent := map[string]interface{}{
			"type":  "content_block_delta",
			"index": f.blockIndex,
			"delta": map[string]interface{}{
				"type": "text_delta",
				"text": chunk.Delta.Content,
			},
		}
		return f.sse.WriteEvent("content_block_delta", marshal(deltaEvent))
	}
	return nil
}

func (f *AnthropicStreamWriter) WriteToolCallStart(tc *llm.ToolCall) error {
	if tc == nil {
		return nil
	}
	if err := f.ensureMessageStart(""); err != nil {
		return err
	}
	// Close any open text block first
	if f.streamState.HasTextBlock {
		stopEvent := map[string]interface{}{
			"type":  "content_block_stop",
			"index": f.blockIndex,
		}
		if err := f.sse.WriteEvent("content_block_stop", marshal(stopEvent)); err != nil {
			return err
		}
		f.blockIndex++
		f.streamState.HasTextBlock = false
	}

	f.streamState.HasToolUseBlock = true
	startEvent := map[string]interface{}{
		"type":  "content_block_start",
		"index": f.blockIndex,
		"content_block": map[string]interface{}{
			"type":  "tool_use",
			"id":    tc.ID,
			"name":  tc.Function.Name,
			"input": map[string]interface{}{},
		},
	}
	return f.sse.WriteEvent("content_block_start", marshal(startEvent))
}

func (f *AnthropicStreamWriter) WriteToolCallDelta(index int, argsDelta string) error {
	deltaEvent := map[string]interface{}{
		"type":  "content_block_delta",
		"index": f.blockIndex,
		"delta": map[string]interface{}{
			"type":         "input_json_delta",
			"partial_json": argsDelta,
		},
	}
	return f.sse.WriteEvent("content_block_delta", marshal(deltaEvent))
}

func (f *AnthropicStreamWriter) WriteToolCallEnd(index int) error {
	if f.streamState.HasToolUseBlock {
		stopEvent := map[string]interface{}{
			"type":  "content_block_stop",
			"index": f.blockIndex,
		}
		f.blockIndex++
		f.streamState.HasToolUseBlock = false
		return f.sse.WriteEvent("content_block_stop", marshal(stopEvent))
	}
	return nil
}

func (f *AnthropicStreamWriter) WriteThinking(thinking string) error {
	if err := f.ensureMessageStart(""); err != nil {
		return err
	}
	if !f.streamState.HasThinkingBlock {
		f.streamState.HasThinkingBlock = true
		startEvent := map[string]interface{}{
			"type":  "content_block_start",
			"index": f.blockIndex,
			"content_block": map[string]interface{}{
				"type":     "thinking",
				"thinking": "",
			},
		}
		if err := f.sse.WriteEvent("content_block_start", marshal(startEvent)); err != nil {
			return err
		}
	}
	deltaEvent := map[string]interface{}{
		"type":  "content_block_delta",
		"index": f.blockIndex,
		"delta": map[string]interface{}{
			"type":     "thinking_delta",
			"thinking": thinking,
		},
	}
	return f.sse.WriteEvent("content_block_delta", marshal(deltaEvent))
}

func (f *AnthropicStreamWriter) WriteFinish(reason llm.FinishReason, usage *llm.Usage) error {
	// Close any open content blocks
	if f.streamState.HasTextBlock || f.streamState.HasThinkingBlock || f.streamState.HasToolUseBlock {
		stopEvent := map[string]interface{}{
			"type":  "content_block_stop",
			"index": f.blockIndex,
		}
		if err := f.sse.WriteEvent("content_block_stop", marshal(stopEvent)); err != nil {
			return err
		}
		f.blockIndex++
		f.streamState.HasTextBlock = false
		f.streamState.HasThinkingBlock = false
		f.streamState.HasToolUseBlock = false
	}

	stopReason := anthropicStopReasonFromFinish(reason)
	deltaEvent := map[string]interface{}{
		"type": "message_delta",
		"delta": map[string]interface{}{
			"stop_reason": stopReason,
		},
	}
	if usage != nil {
		deltaEvent["usage"] = map[string]interface{}{
			"input_tokens":    usage.PromptTokens,
			"output_tokens":   usage.CompletionTokens,
			"thinking_tokens": usage.ThinkingTokens,
		}
	}
	if err := f.sse.WriteEvent("message_delta", marshal(deltaEvent)); err != nil {
		return err
	}

	stopEvent := map[string]interface{}{"type": "message_stop"}
	return f.sse.WriteEvent("message_stop", marshal(stopEvent))
}

func (f *AnthropicStreamWriter) WriteError(code, message string) error {
	errEvent := map[string]interface{}{
		"type": "error",
		"error": map[string]interface{}{
			"type":    code,
			"message": message,
		},
	}
	return f.sse.WriteEvent("error", marshal(errEvent))
}

func (f *AnthropicStreamWriter) WriteRaw(event string, data interface{}) error {
	return f.sse.WriteEvent(event, marshal(data))
}

func (f *AnthropicStreamWriter) Flush() { f.sse.Flush() }

// --- Generic/Internal format writer ---

// InternalStreamWriter writes raw llm.StreamChunk as JSON SSE events.
// Used for internal APIs and testing.
type InternalStreamWriter struct {
	sse *SSEWriter
}

// NewInternalStreamWriter creates a new internal format stream writer.
func NewInternalStreamWriter(w io.Writer) *InternalStreamWriter {
	return &InternalStreamWriter{sse: NewSSEWriter(w)}
}

func (f *InternalStreamWriter) Format() Format { return FormatInternal }

func (f *InternalStreamWriter) WriteChunk(chunk *llm.StreamChunk) error {
	return f.sse.WriteEvent("chunk", marshal(chunk))
}

func (f *InternalStreamWriter) WriteToolCallStart(tc *llm.ToolCall) error {
	return f.sse.WriteEvent("tool_call_start", marshal(tc))
}

func (f *InternalStreamWriter) WriteToolCallDelta(index int, argsDelta string) error {
	return f.sse.WriteEvent("tool_call_delta", marshal(map[string]interface{}{
		"index":   index,
		"content": argsDelta,
	}))
}

func (f *InternalStreamWriter) WriteToolCallEnd(index int) error {
	return f.sse.WriteEvent("tool_call_end", marshal(map[string]interface{}{
		"index": index,
	}))
}

func (f *InternalStreamWriter) WriteThinking(thinking string) error {
	return f.sse.WriteEvent("thinking", marshal(map[string]interface{}{
		"content": thinking,
	}))
}

func (f *InternalStreamWriter) WriteFinish(reason llm.FinishReason, usage *llm.Usage) error {
	data := map[string]interface{}{
		"reason": string(reason),
	}
	if usage != nil {
		data["usage"] = usage
	}
	return f.sse.WriteEvent("finish", marshal(data))
}

func (f *InternalStreamWriter) WriteError(code, message string) error {
	return f.sse.WriteEvent("error", marshal(map[string]interface{}{
		"code":    code,
		"message": message,
	}))
}

func (f *InternalStreamWriter) WriteRaw(event string, data interface{}) error {
	return f.sse.WriteEvent(event, marshal(data))
}

func (f *InternalStreamWriter) Flush() { f.sse.Flush() }

// --- Helpers ---

func marshal(v interface{}) []byte {
	data, _ := json.Marshal(v)
	return data
}

type openAIToolCallDelta struct {
	Index    int                `json:"index"`
	ID       string             `json:"id,omitempty"`
	Type     string             `json:"type,omitempty"`
	Function *openAIFunctionDelta `json:"function,omitempty"`
}

type openAIFunctionDelta struct {
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
}

func buildOpenAIChunk(id, model string, index int, role llm.Role, content string, toolCall *openAIToolCallDelta, finishReason *string) map[string]interface{} {
	delta := map[string]interface{}{}
	if role != "" {
		delta["role"] = string(role)
	}
	if content != "" {
		delta["content"] = content
	}
	if toolCall != nil {
		delta["tool_calls"] = []interface{}{toolCall}
	}

	choice := map[string]interface{}{
		"index": index,
		"delta": delta,
	}
	if finishReason != nil {
		choice["finish_reason"] = *finishReason
	}

	return map[string]interface{}{
		"id":      id,
		"object":  "chat.completion.chunk",
		"created": time.Now().Unix(),
		"model":   model,
		"choices": []interface{}{choice},
	}
}

func anthropicStopReasonFromFinish(fr llm.FinishReason) string {
	switch fr {
	case llm.FinishReasonStop, llm.FinishReasonEndTurn:
		return "end_turn"
	case llm.FinishReasonLength:
		return "max_tokens"
	case llm.FinishReasonToolCalls:
		return "tool_use"
	case llm.FinishReasonContentFilter:
		return "content_filter"
	default:
		return string(fr)
	}
}
