package tools

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

// mockChatClient implements a fake LLM client for testing the tool loop.
type mockChatClient struct {
	responses []*llm.ChatResponse
	callIdx   int
}

func (m *mockChatClient) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if m.callIdx >= len(m.responses) {
		return nil, errors.New("no more mock responses")
	}
	resp := m.responses[m.callIdx]
	m.callIdx++
	return resp, nil
}

func TestLoop_Run_NoToolCalls(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)

	client := &mockChatClient{
		responses: []*llm.ChatResponse{
			{
				Choices: []llm.Choice{{
					Message: llm.Message{Role: llm.RoleAssistant, Content: "Hello!"},
				}},
			},
		},
	}

	loop := NewLoop(exec, WithMaxIterations(5))
	ctx := context.Background()
	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hi"}},
	}

	resp, err := loop.Run(ctx, req, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "Hello!" {
		t.Errorf("got %q, want Hello!", resp.Choices[0].Message.Content)
	}
	if client.callIdx != 1 {
		t.Errorf("expected 1 LLM call, got %d", client.callIdx)
	}
}

func TestLoop_Run_SingleToolCall(t *testing.T) {
	reg := NewRegistry()
	reg.Register(NewCalculatorTool())
	exec := NewExecutor(reg)

	client := &mockChatClient{
		responses: []*llm.ChatResponse{
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role: llm.RoleAssistant,
						ToolCalls: []llm.ToolCall{{
							ID:   "call_1",
							Type: "function",
							Function: llm.ToolCallFunction{
								Name:      "calculator",
								Arguments: json.RawMessage(`{"expression":"2+3"}`),
							},
						}},
					},
					FinishReason: llm.FinishReasonToolCalls,
				}},
			},
			{
				Choices: []llm.Choice{{
					Message: llm.Message{Role: llm.RoleAssistant, Content: "The answer is 5."},
				}},
			},
		},
	}

	loop := NewLoop(exec, WithMaxIterations(5))
	ctx := context.Background()
	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "What is 2+3?"}},
	}

	resp, err := loop.Run(ctx, req, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "The answer is 5." {
		t.Errorf("got %q, want 'The answer is 5.'", resp.Choices[0].Message.Content)
	}
	if client.callIdx != 2 {
		t.Errorf("expected 2 LLM calls, got %d", client.callIdx)
	}
}

func TestLoop_Run_MaxIterations(t *testing.T) {
	reg := NewRegistry()
	reg.Register(NewCalculatorTool())
	exec := NewExecutor(reg)

	client := &mockChatClient{
		responses: []*llm.ChatResponse{
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role: llm.RoleAssistant,
						ToolCalls: []llm.ToolCall{{
							ID:   "call_1",
							Type: "function",
							Function: llm.ToolCallFunction{
								Name:      "calculator",
								Arguments: json.RawMessage(`{"expression":"1+1"}`),
							},
						}},
					},
					FinishReason: llm.FinishReasonToolCalls,
				}},
			},
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role: llm.RoleAssistant,
						ToolCalls: []llm.ToolCall{{
							ID:   "call_2",
							Type: "function",
							Function: llm.ToolCallFunction{
								Name:      "calculator",
								Arguments: json.RawMessage(`{"expression":"2+2"}`),
							},
						}},
					},
					FinishReason: llm.FinishReasonToolCalls,
				}},
			},
		},
	}

	loop := NewLoop(exec, WithMaxIterations(2))
	ctx := context.Background()
	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Calculate"}},
	}

	resp, err := loop.Run(ctx, req, client)
	if !errors.Is(err, ErrMaxIterationsExceeded) {
		t.Fatalf("expected ErrMaxIterationsExceeded, got: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	if client.callIdx != 2 {
		t.Errorf("expected 2 LLM calls, got %d", client.callIdx)
	}
}

func TestLoop_Run_ContextTimeout(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)

	client := &mockChatClient{
		responses: []*llm.ChatResponse{
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role:      llm.RoleAssistant,
						Content:   "",
						ToolCalls: []llm.ToolCall{},
					},
				}},
			},
		},
	}

	loop := NewLoop(exec)
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	time.Sleep(5 * time.Millisecond)

	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hi"}},
	}

	_, err := loop.Run(ctx, req, client)
	if err == nil {
		t.Error("expected timeout error")
	}
}

func TestLoop_Run_LLMError(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)

	client := &mockChatClient{}

	loop := NewLoop(exec)
	ctx := context.Background()
	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Hi"}},
	}

	_, err := loop.Run(ctx, req, client)
	if err == nil {
		t.Error("expected error from LLM client")
	}
}

func TestLoop_Run_PreservesOriginalMessages(t *testing.T) {
	reg := NewRegistry()
	reg.Register(NewCalculatorTool())
	exec := NewExecutor(reg)

	client := &mockChatClient{
		responses: []*llm.ChatResponse{
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role: llm.RoleAssistant,
						ToolCalls: []llm.ToolCall{{
							ID:   "call_1",
							Type: "function",
							Function: llm.ToolCallFunction{
								Name:      "calculator",
								Arguments: json.RawMessage(`{"expression":"1+1"}`),
							},
						}},
					},
				}},
			},
			{
				Choices: []llm.Choice{{
					Message: llm.Message{Role: llm.RoleAssistant, Content: "Done"},
				}},
			},
		},
	}

	loop := NewLoop(exec)
	ctx := context.Background()
	original := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "Test"}},
	}

	_, err := loop.Run(ctx, original, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(original.Messages) != 1 {
		t.Errorf("original request mutated: got %d messages, want 1", len(original.Messages))
	}
}

func TestWithMaxIterations(t *testing.T) {
	opt := WithMaxIterations(10)
	l := &Loop{}
	opt(l)
	if l.maxIterations != 10 {
		t.Errorf("got maxIterations %d, want 10", l.maxIterations)
	}
}
