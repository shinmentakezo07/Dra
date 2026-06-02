package streaming

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"dra-platform/backend/pkg/llm"
)

// --- Accumulator tests ---

func TestAccumulator_Content(t *testing.T) {
	acc := NewAccumulator()
	acc.Add(llm.StreamChunk{Delta: llm.Message{Role: llm.RoleAssistant, Content: "Hello"}})
	acc.Add(llm.StreamChunk{Delta: llm.Message{Content: " world"}})

	msg, done := acc.Message()
	if done {
		t.Error("expected not done")
	}
	if msg.Content != "Hello world" {
		t.Errorf("content = %q, want %q", msg.Content, "Hello world")
	}
	if msg.Role != llm.RoleAssistant {
		t.Errorf("role = %q", msg.Role)
	}
}

func TestAccumulator_ToolCalls(t *testing.T) {
	acc := NewAccumulator()
	acc.Add(llm.StreamChunk{
		Delta: llm.Message{
			Role: llm.RoleAssistant,
			ToolCalls: []llm.ToolCall{
				{ID: "call_1", Type: "function", Function: llm.ToolCallFunction{Name: "calc", Arguments: json.RawMessage(`{"ex`)}},
			},
		},
	})
	acc.Add(llm.StreamChunk{
		Delta: llm.Message{
			ToolCalls: []llm.ToolCall{
				{Function: llm.ToolCallFunction{Arguments: json.RawMessage(`pression":"1+1"}`)}},
			},
		},
	})

	msg, done := acc.Message()
	if done {
		t.Error("expected not done")
	}
	if len(msg.ToolCalls) != 1 {
		t.Fatalf("tool calls = %d, want 1", len(msg.ToolCalls))
	}
	if string(msg.ToolCalls[0].Function.Arguments) != `{"expression":"1+1"}` {
		t.Errorf("arguments = %q", string(msg.ToolCalls[0].Function.Arguments))
	}
}

func TestAccumulator_FinishReason(t *testing.T) {
	acc := NewAccumulator()
	acc.Add(llm.StreamChunk{
		Delta:        llm.Message{Role: llm.RoleAssistant},
		FinishReason: ptrFinishReason(llm.FinishReasonStop),
	})

	msg, done := acc.Message()
	if !done {
		t.Error("expected done")
	}
	if msg.Role != llm.RoleAssistant {
		t.Errorf("role = %q", msg.Role)
	}
}

func TestAccumulator_Thinking(t *testing.T) {
	acc := NewAccumulator()
	acc.Add(llm.StreamChunk{Thinking: "let me think"})
	acc.Add(llm.StreamChunk{Delta: llm.Message{Content: "answer"}})

	msg, _ := acc.Message()
	if len(msg.ContentBlocks) != 1 {
		t.Fatalf("content blocks = %d, want 1", len(msg.ContentBlocks))
	}
	if msg.ContentBlocks[0].Type != llm.ContentTypeThinking {
		t.Errorf("block type = %q", msg.ContentBlocks[0].Type)
	}
	if msg.ContentBlocks[0].Thinking != "let me think" {
		t.Errorf("thinking = %q", msg.ContentBlocks[0].Thinking)
	}
}

func TestAccumulator_Empty(t *testing.T) {
	acc := NewAccumulator()
	msg, done := acc.Message()
	if done {
		t.Error("expected not done")
	}
	if msg.Content != "" {
		t.Errorf("content = %q", msg.Content)
	}
}

// --- OpenAI Writer tests ---

func TestOpenAIStreamWriter_BasicChunk(t *testing.T) {
	var buf bytes.Buffer
	w := NewOpenAIStreamWriter(&buf, "gpt-4o")

	chunk := &llm.StreamChunk{
		Index: 0,
		Delta: llm.Message{Role: llm.RoleAssistant, Content: "Hello"},
	}
	if err := w.WriteChunk(chunk); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "data: ") {
		t.Error("missing data prefix")
	}
	if !strings.Contains(output, "chat.completion.chunk") {
		t.Error("missing object type")
	}
	if !strings.Contains(output, "Hello") {
		t.Error("missing content")
	}
}

func TestOpenAIStreamWriter_FinishWithUsage(t *testing.T) {
	var buf bytes.Buffer
	w := NewOpenAIStreamWriter(&buf, "gpt-4o")

	usage := &llm.Usage{PromptTokens: 10, CompletionTokens: 20, TotalTokens: 30}
	if err := w.WriteFinish(llm.FinishReasonStop, usage); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "[DONE]") {
		t.Error("missing [DONE]")
	}
	if !strings.Contains(output, "total_tokens") {
		t.Error("missing usage")
	}
}

func TestOpenAIStreamWriter_ToolCall(t *testing.T) {
	var buf bytes.Buffer
	w := NewOpenAIStreamWriter(&buf, "gpt-4o")

	tc := &llm.ToolCall{ID: "call_1", Type: "function", Function: llm.ToolCallFunction{Name: "get_weather"}}
	if err := w.WriteToolCallStart(tc); err != nil {
		t.Fatal(err)
	}
	if err := w.WriteToolCallDelta(0, `{"location":"SF"}`); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "call_1") {
		t.Error("missing tool call ID")
	}
	if !strings.Contains(output, "get_weather") {
		t.Error("missing function name")
	}
	if !strings.Contains(output, "location") || !strings.Contains(output, "SF") {
		t.Error("missing arguments")
	}
}

func TestOpenAIStreamWriter_Thinking(t *testing.T) {
	var buf bytes.Buffer
	w := NewOpenAIStreamWriter(&buf, "o1-preview")

	if err := w.WriteThinking("reasoning..."); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "reasoning_content") {
		t.Error("missing reasoning_content")
	}
	if !strings.Contains(output, "reasoning...") {
		t.Error("missing thinking content")
	}
}

func TestOpenAIStreamWriter_Error(t *testing.T) {
	var buf bytes.Buffer
	w := NewOpenAIStreamWriter(&buf, "gpt-4o")

	if err := w.WriteError("server_error", "provider disconnected"); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "server_error") {
		t.Error("missing error code")
	}
	if !strings.Contains(output, "provider disconnected") {
		t.Error("missing error message")
	}
}

// --- Anthropic Writer tests ---

func TestAnthropicStreamWriter_BasicChunk(t *testing.T) {
	var buf bytes.Buffer
	w := NewAnthropicStreamWriter(&buf, "claude-opus-4")

	chunk := &llm.StreamChunk{
		ID:    "msg_test",
		Index: 0,
		Delta: llm.Message{Content: "Hello"},
	}
	if err := w.WriteChunk(chunk); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "event: message_start") {
		t.Error("missing message_start event")
	}
	if !strings.Contains(output, "event: content_block_start") {
		t.Error("missing content_block_start event")
	}
	if !strings.Contains(output, "event: content_block_delta") {
		t.Error("missing content_block_delta event")
	}
	if !strings.Contains(output, "text_delta") {
		t.Error("missing text_delta type")
	}
}

func TestAnthropicStreamWriter_ToolCall(t *testing.T) {
	var buf bytes.Buffer
	w := NewAnthropicStreamWriter(&buf, "claude-opus-4")

	// First write some content to create a text block
	w.WriteChunk(&llm.StreamChunk{Delta: llm.Message{Content: "Let me check"}})

	tc := &llm.ToolCall{ID: "tu_1", Type: "function", Function: llm.ToolCallFunction{Name: "get_weather"}}
	if err := w.WriteToolCallStart(tc); err != nil {
		t.Fatal(err)
	}
	if err := w.WriteToolCallDelta(0, `{"location":"NYC"}`); err != nil {
		t.Fatal(err)
	}
	if err := w.WriteToolCallEnd(0); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "content_block_stop") {
		t.Error("missing content_block_stop to close text block")
	}
	if !strings.Contains(output, "tool_use") {
		t.Error("missing tool_use content block")
	}
	if !strings.Contains(output, "tu_1") {
		t.Error("missing tool use ID")
	}
	if !strings.Contains(output, "input_json_delta") {
		t.Error("missing input_json_delta")
	}
}

func TestAnthropicStreamWriter_Thinking(t *testing.T) {
	var buf bytes.Buffer
	w := NewAnthropicStreamWriter(&buf, "claude-opus-4")

	if err := w.WriteThinking("deep thought"); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "thinking_delta") {
		t.Error("missing thinking_delta type")
	}
	if !strings.Contains(output, "deep thought") {
		t.Error("missing thinking content")
	}
}

func TestAnthropicStreamWriter_Finish(t *testing.T) {
	var buf bytes.Buffer
	w := NewAnthropicStreamWriter(&buf, "claude-opus-4")

	// Write some content first
	w.WriteChunk(&llm.StreamChunk{Delta: llm.Message{Content: "done"}})

	usage := &llm.Usage{PromptTokens: 10, CompletionTokens: 5}
	if err := w.WriteFinish(llm.FinishReasonStop, usage); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "message_delta") {
		t.Error("missing message_delta event")
	}
	if !strings.Contains(output, "message_stop") {
		t.Error("missing message_stop event")
	}
	if !strings.Contains(output, "end_turn") {
		t.Error("missing end_turn stop reason")
	}
}

func TestAnthropicStreamWriter_Error(t *testing.T) {
	var buf bytes.Buffer
	w := NewAnthropicStreamWriter(&buf, "claude-opus-4")

	if err := w.WriteError("overloaded_error", "Overloaded"); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "event: error") {
		t.Error("missing error event")
	}
	if !strings.Contains(output, "overloaded_error") {
		t.Error("missing error type")
	}
}

// --- Internal Writer tests ---

func TestInternalStreamWriter_BasicChunk(t *testing.T) {
	var buf bytes.Buffer
	w := NewInternalStreamWriter(&buf)

	chunk := &llm.StreamChunk{
		Index: 0,
		Delta: llm.Message{Content: "Hello"},
	}
	if err := w.WriteChunk(chunk); err != nil {
		t.Fatal(err)
	}

	output := buf.String()
	if !strings.Contains(output, "event: chunk") {
		t.Error("missing chunk event")
	}
}

// --- StreamPump tests ---

func TestStreamPump_OpenAI(t *testing.T) {
	var buf bytes.Buffer
	writer := NewOpenAIStreamWriter(&buf, "gpt-4o")
	pump := NewStreamPump(writer)

	ch := make(chan llm.StreamChunk, 3)
	ch <- llm.StreamChunk{Delta: llm.Message{Role: llm.RoleAssistant, Content: "Hi"}}
	ch <- llm.StreamChunk{Delta: llm.Message{Content: " there"}}
	fr := llm.FinishReasonStop
	ch <- llm.StreamChunk{FinishReason: &fr, Usage: &llm.Usage{PromptTokens: 5, CompletionTokens: 2, TotalTokens: 7}}
	close(ch)

	msg, usage, err := pump.Pump(context.Background(), ch)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Content != "Hi there" {
		t.Errorf("content = %q", msg.Content)
	}
	if usage == nil || usage.TotalTokens != 7 {
		t.Error("usage not captured")
	}

	output := buf.String()
	if !strings.Contains(output, "[DONE]") {
		t.Error("missing [DONE]")
	}
}

func TestStreamPump_Anthropic(t *testing.T) {
	var buf bytes.Buffer
	writer := NewAnthropicStreamWriter(&buf, "claude-opus-4")
	pump := NewStreamPump(writer)

	ch := make(chan llm.StreamChunk, 2)
	ch <- llm.StreamChunk{ID: "msg_1", Delta: llm.Message{Content: "Hello"}}
	fr := llm.FinishReasonEndTurn
	ch <- llm.StreamChunk{FinishReason: &fr}
	close(ch)

	msg, _, err := pump.Pump(context.Background(), ch)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Content != "Hello" {
		t.Errorf("content = %q", msg.Content)
	}

	output := buf.String()
	if !strings.Contains(output, "message_start") {
		t.Error("missing message_start")
	}
	if !strings.Contains(output, "message_stop") {
		t.Error("missing message_stop")
	}
}

func TestStreamPump_EmptyStream(t *testing.T) {
	var buf bytes.Buffer
	writer := NewOpenAIStreamWriter(&buf, "gpt-4o")
	pump := NewStreamPump(writer)

	ch := make(chan llm.StreamChunk)
	close(ch)

	msg, _, err := pump.Pump(context.Background(), ch)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Content != "" {
		t.Errorf("content = %q", msg.Content)
	}
}

func TestStreamPump_ContextCancelled(t *testing.T) {
	var buf bytes.Buffer
	writer := NewOpenAIStreamWriter(&buf, "gpt-4o")
	pump := NewStreamPump(writer)

	ch := make(chan llm.StreamChunk) // never closed
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	_, _, err := pump.Pump(ctx, ch)
	if err != context.Canceled {
		t.Errorf("err = %v, want Canceled", err)
	}
}

// --- Format helper ---

func TestNewWriterFromIO(t *testing.T) {
	var buf bytes.Buffer

	w := NewWriterFromIO(&buf, FormatOpenAI, "gpt-4o")
	if w.Format() != FormatOpenAI {
		t.Error("expected OpenAI format")
	}

	w = NewWriterFromIO(&buf, FormatAnthropic, "claude-opus-4")
	if w.Format() != FormatAnthropic {
		t.Error("expected Anthropic format")
	}

	w = NewWriterFromIO(&buf, FormatInternal, "model")
	if w.Format() != FormatInternal {
		t.Error("expected Internal format")
	}
}

// --- Anthropic stop reason mapping ---

func TestAnthropicStopReasonFromFinish(t *testing.T) {
	tests := []struct {
		input llm.FinishReason
		want  string
	}{
		{llm.FinishReasonStop, "end_turn"},
		{llm.FinishReasonEndTurn, "end_turn"},
		{llm.FinishReasonLength, "max_tokens"},
		{llm.FinishReasonToolCalls, "tool_use"},
		{llm.FinishReasonContentFilter, "content_filter"},
		{llm.FinishReason("weird"), "weird"},
	}
	for _, tt := range tests {
		got := anthropicStopReasonFromFinish(tt.input)
		if got != tt.want {
			t.Errorf("anthropicStopReasonFromFinish(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func ptrFinishReason(fr llm.FinishReason) *llm.FinishReason {
	return &fr
}
