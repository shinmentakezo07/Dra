package tools

import (
	"context"
	"encoding/json"
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestStreamAccumulator_AddChunk_Content(t *testing.T) {
	acc := NewStreamAccumulator()

	acc.AddChunk(llm.StreamChunk{
		Delta: llm.Message{Role: llm.RoleAssistant, Content: "Hello"},
	})
	acc.AddChunk(llm.StreamChunk{
		Delta: llm.Message{Content: " world"},
	})

	msg, done := acc.Finalize()
	if done {
		t.Error("expected not done")
	}
	if msg.Content != "Hello world" {
		t.Errorf("got %q, want 'Hello world'", msg.Content)
	}
}

func TestStreamAccumulator_AddChunk_ToolCall(t *testing.T) {
	acc := NewStreamAccumulator()

	acc.AddChunk(llm.StreamChunk{
		Delta: llm.Message{
			Role: llm.RoleAssistant,
			ToolCalls: []llm.ToolCall{
				{ID: "call_1", Type: "function", Function: llm.ToolCallFunction{Name: "calc", Arguments: json.RawMessage(`{"ex`)}},
			},
		},
	})
	acc.AddChunk(llm.StreamChunk{
		Delta: llm.Message{
			ToolCalls: []llm.ToolCall{
				{Function: llm.ToolCallFunction{Arguments: json.RawMessage(`pression":"1+1"}`)}},
			},
		},
	})

	msg, done := acc.Finalize()
	if done {
		t.Error("expected not done")
	}
	if len(msg.ToolCalls) != 1 {
		t.Fatalf("got %d tool calls, want 1", len(msg.ToolCalls))
	}
	if string(msg.ToolCalls[0].Function.Arguments) != `{"expression":"1+1"}` {
		t.Errorf("got arguments %q, want '{\"expression\":\"1+1\"}'", string(msg.ToolCalls[0].Function.Arguments))
	}
}

func TestStreamAccumulator_FinishReason(t *testing.T) {
	acc := NewStreamAccumulator()

	fr := llm.FinishReasonToolCalls
	acc.AddChunk(llm.StreamChunk{
		Delta:        llm.Message{Role: llm.RoleAssistant, Content: ""},
		FinishReason: &fr,
	})

	msg, done := acc.Finalize()
	if !done {
		t.Error("expected done")
	}
	if msg.Role != llm.RoleAssistant {
		t.Errorf("got role %q, want assistant", msg.Role)
	}
}

func TestStreamHandler_Handle(t *testing.T) {
	reg := NewRegistry()
	reg.Register(NewCalculatorTool())
	exec := NewExecutor(reg)

	handler := NewStreamHandler(exec)
	ctx := context.Background()

	chunks := []llm.StreamChunk{
		{Delta: llm.Message{Role: llm.RoleAssistant, Content: ""}},
		{Delta: llm.Message{ToolCalls: []llm.ToolCall{
			{ID: "call_1", Type: "function", Function: llm.ToolCallFunction{Name: "calculator", Arguments: json.RawMessage(`{"expression":"2+3"}`)}},
		}}},
	}
	fr := llm.FinishReasonToolCalls
	chunks = append(chunks, llm.StreamChunk{FinishReason: &fr})

	result, err := handler.Handle(ctx, chunks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Message.Content != "" {
		t.Errorf("got content %q, want empty", result.Message.Content)
	}
	if len(result.Message.ToolCalls) != 1 {
		t.Fatalf("got %d tool calls, want 1", len(result.Message.ToolCalls))
	}
	if len(result.ToolResults) != 1 {
		t.Fatalf("got %d tool results, want 1", len(result.ToolResults))
	}
	if result.ToolResults[0].Error != nil {
		t.Errorf("unexpected tool error: %v", result.ToolResults[0].Error)
	}
}

func TestStreamHandler_Handle_NoToolCalls(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)

	handler := NewStreamHandler(exec)
	ctx := context.Background()

	fr := llm.FinishReasonStop
	chunks := []llm.StreamChunk{
		{Delta: llm.Message{Role: llm.RoleAssistant, Content: "Hello"}},
		{Delta: llm.Message{Content: "!"}, FinishReason: &fr},
	}

	result, err := handler.Handle(ctx, chunks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Message.Content != "Hello!" {
		t.Errorf("got content %q, want Hello!", result.Message.Content)
	}
	if len(result.ToolResults) != 0 {
		t.Errorf("got %d tool results, want 0", len(result.ToolResults))
	}
}

func TestStreamHandler_Handle_Empty(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)

	handler := NewStreamHandler(exec)
	ctx := context.Background()

	result, err := handler.Handle(ctx, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Message.Content != "" {
		t.Errorf("got content %q, want empty", result.Message.Content)
	}
}
