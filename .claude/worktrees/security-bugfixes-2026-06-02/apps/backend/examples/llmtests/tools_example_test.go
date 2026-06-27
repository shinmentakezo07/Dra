package llmtests

import (
	"context"
	"encoding/json"
	"strconv"
	"testing"

	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/tools"
	"dra-platform/backend/pkg/llm/tools/websearch"
)

func parseFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// RunCalculatorToolExample demonstrates the calculator tool.
func RunCalculatorToolExample(t *testing.T) {
	reg := tools.NewRegistry()
	reg.Register(tools.NewCalculatorTool())
	exec := tools.NewExecutor(reg)

	calls := []tools.ToolCall{
		{ID: "call_1", Name: "calculator", Arguments: json.RawMessage(`{"expression": "2 + 3 * 4"}`)},
	}

	results := exec.ExecuteParallel(context.Background(), calls)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Error != nil {
		t.Fatalf("calculator failed: %v", results[0].Error)
	}

	var result float64
	switch v := results[0].Result.(type) {
	case float64:
		result = v
	case string:
		result = parseFloat(v)
	default:
		t.Fatalf("expected numeric result, got %T", results[0].Result)
	}
	if result != 14 {
		t.Errorf("got result %v, want 14", result)
	}
}

// RunWebSearchToolExample demonstrates the web search tool with a mock provider.
func RunWebSearchToolExample(t *testing.T) {
	mock := websearch.NewMockProvider()
	mock.AddResult("golang", websearch.Result{
		Title:   "The Go Programming Language",
		URL:     "https://go.dev",
		Snippet: "Go is an open source programming language that makes it easy to build simple, reliable, and efficient software.",
	})
	mock.AddResult("golang", websearch.Result{
		Title:   "A Tour of Go",
		URL:     "https://go.dev/tour",
		Snippet: "Welcome to a tour of the Go programming language.",
	})

	reg := tools.NewRegistry()
	reg.Register(websearch.Tool(mock))
	exec := tools.NewExecutor(reg)

	calls := []tools.ToolCall{
		{ID: "call_1", Name: "web_search", Arguments: json.RawMessage(`{"query": "golang", "max_results": 3}`)},
	}

	results := exec.ExecuteParallel(context.Background(), calls)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Error != nil {
		t.Fatalf("web search failed: %v", results[0].Error)
	}

	resultStr, ok := results[0].Result.(string)
	if !ok {
		t.Fatalf("expected string result, got %T", results[0].Result)
	}
	if resultStr == "" {
		t.Error("expected non-empty search result")
	}
}

// RunConversationLoopExample demonstrates the tool conversation loop.
func RunConversationLoopExample(t *testing.T) {
	reg := tools.NewRegistry()
	reg.Register(tools.NewCalculatorTool())
	exec := tools.NewExecutor(reg)
	loop := tools.NewLoop(exec, tools.WithMaxIterations(5))

	// Mock client that always returns a tool call
	mockClient := &mockChatClient{
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
								Arguments: json.RawMessage(`{"expression": "1 + 1"}`),
							},
						}},
					},
					FinishReason: llm.FinishReasonToolCalls,
				}},
			},
			{
				Choices: []llm.Choice{{
					Message: llm.Message{
						Role:    llm.RoleAssistant,
						Content: "The answer is 2.",
					},
				}},
			},
		},
	}

	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "What is 1+1?"}},
	}

	resp, err := loop.Run(context.Background(), req, mockClient)
	if err != nil {
		t.Fatalf("loop failed: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	if len(resp.Choices) == 0 {
		t.Fatal("expected at least one choice")
	}
	if resp.Choices[0].Message.Content != "The answer is 2." {
		t.Errorf("got content %q, want 'The answer is 2.'", resp.Choices[0].Message.Content)
	}
}

// RunStreamHandlerExample demonstrates stream accumulation and tool execution.
func RunStreamHandlerExample(t *testing.T) {
	reg := tools.NewRegistry()
	reg.Register(tools.NewCalculatorTool())
	exec := tools.NewExecutor(reg)
	handler := tools.NewStreamHandler(exec)

	chunks := []llm.StreamChunk{
		{Delta: llm.Message{Role: llm.RoleAssistant, Content: "Let me calculate "}},
		{Delta: llm.Message{Content: "that for you."}},
		{
			Delta: llm.Message{
				ToolCalls: []llm.ToolCall{{
					ID:   "call_1",
					Type: "function",
					Function: llm.ToolCallFunction{
						Name:      "calculator",
						Arguments: json.RawMessage(`{"expression": "5 * 5"}`),
					},
				}},
			},
			FinishReason: func() *llm.FinishReason { r := llm.FinishReasonToolCalls; return &r }(),
		},
	}

	result, err := handler.Handle(context.Background(), chunks)
	if err != nil {
		t.Fatalf("stream handler failed: %v", err)
	}
	if !result.Done {
		t.Error("expected stream to be done")
	}
	if len(result.ToolResults) != 1 {
		t.Fatalf("expected 1 tool result, got %d", len(result.ToolResults))
	}
	if result.ToolResults[0].Error != nil {
		t.Fatalf("tool execution failed: %v", result.ToolResults[0].Error)
	}
}

// mockChatClient is a test helper that implements tools.ChatClient.
type mockChatClient struct {
	responses []*llm.ChatResponse
	idx       int
}

func (m *mockChatClient) Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if m.idx >= len(m.responses) {
		return nil, context.Canceled
	}
	resp := m.responses[m.idx]
	m.idx++
	return resp, nil
}

// TestExamples runs all example functions.
func TestExamples(t *testing.T) {
	t.Run("Calculator", RunCalculatorToolExample)
	t.Run("WebSearch", RunWebSearchToolExample)
	t.Run("ConversationLoop", RunConversationLoopExample)
	t.Run("StreamHandler", RunStreamHandlerExample)
}
