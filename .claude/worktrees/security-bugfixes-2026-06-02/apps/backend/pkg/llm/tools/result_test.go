package tools

import (
	"encoding/json"
	"errors"
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestFormatToolResult_Success(t *testing.T) {
	result := ToolResult{
		ID:     "call_1",
		Result: "42",
		Error:  nil,
	}

	msg := FormatToolResult(result)
	if msg.Role != llm.RoleTool {
		t.Errorf("got role %q, want tool", msg.Role)
	}
	if msg.ToolCallID != "call_1" {
		t.Errorf("got tool_call_id %q, want call_1", msg.ToolCallID)
	}
	if msg.Content != "42" {
		t.Errorf("got content %q, want 42", msg.Content)
	}
}

func TestFormatToolResult_Error(t *testing.T) {
	result := ToolResult{
		ID:     "call_1",
		Result: nil,
		Error:  errors.New("something went wrong"),
	}

	msg := FormatToolResult(result)
	if msg.Role != llm.RoleTool {
		t.Errorf("got role %q, want tool", msg.Role)
	}
	if msg.ToolCallID != "call_1" {
		t.Errorf("got tool_call_id %q, want call_1", msg.ToolCallID)
	}
	if msg.Content != "Error: something went wrong" {
		t.Errorf("got content %q, want 'Error: something went wrong'", msg.Content)
	}
}

func TestFormatToolResult_StructResult(t *testing.T) {
	result := ToolResult{
		ID:     "call_1",
		Result: map[string]interface{}{"answer": 42},
		Error:  nil,
	}

	msg := FormatToolResult(result)
	if msg.Role != llm.RoleTool {
		t.Errorf("got role %q, want tool", msg.Role)
	}
	if msg.ToolCallID != "call_1" {
		t.Errorf("got tool_call_id %q, want call_1", msg.ToolCallID)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(msg.Content), &parsed); err != nil {
		t.Fatalf("expected valid JSON content: %v", err)
	}
	if parsed["answer"] != float64(42) {
		t.Errorf("got answer %v, want 42", parsed["answer"])
	}
}

func TestFormatToolResults_Multiple(t *testing.T) {
	results := []ToolResult{
		{ID: "call_1", Result: "result1", Error: nil},
		{ID: "call_2", Result: nil, Error: errors.New("failed")},
	}

	msgs := FormatToolResults(results)
	if len(msgs) != 2 {
		t.Fatalf("got %d messages, want 2", len(msgs))
	}
	if msgs[0].Content != "result1" {
		t.Errorf("got first content %q, want result1", msgs[0].Content)
	}
	if msgs[1].Content != "Error: failed" {
		t.Errorf("got second content %q, want 'Error: failed'", msgs[1].Content)
	}
}

func TestFormatToolResults_Empty(t *testing.T) {
	msgs := FormatToolResults(nil)
	if len(msgs) != 0 {
		t.Errorf("got %d messages, want 0", len(msgs))
	}
}

func TestFormatToolCallsMessage(t *testing.T) {
	calls := []llm.ToolCall{
		{
			ID:   "call_1",
			Type: "function",
			Function: llm.ToolCallFunction{
				Name:      "calculator",
				Arguments: json.RawMessage(`{"expression":"1+1"}`),
			},
		},
	}

	msg := FormatToolCallsMessage(calls)
	if msg.Role != llm.RoleAssistant {
		t.Errorf("got role %q, want assistant", msg.Role)
	}
	if len(msg.ToolCalls) != 1 {
		t.Fatalf("got %d tool_calls, want 1", len(msg.ToolCalls))
	}
	if msg.ToolCalls[0].ID != "call_1" {
		t.Errorf("got tool_call id %q, want call_1", msg.ToolCalls[0].ID)
	}
}

func TestFormatToolCallsMessage_Empty(t *testing.T) {
	msg := FormatToolCallsMessage(nil)
	if msg.Role != llm.RoleAssistant {
		t.Errorf("got role %q, want assistant", msg.Role)
	}
	if len(msg.ToolCalls) != 0 {
		t.Errorf("got %d tool_calls, want 0", len(msg.ToolCalls))
	}
}
