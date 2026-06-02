package tools

import (
	"context"
	"fmt"

	"dra-platform/backend/pkg/llm"
)

// ChatClient is the interface for LLM clients used by the tool loop.
type ChatClient interface {
	Chat(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)
}

// Loop orchestrates the tool call conversation cycle.
type Loop struct {
	executor      *Executor
	maxIterations int
}

// LoopOption configures the tool loop.
type LoopOption func(*Loop)

// WithMaxIterations sets the maximum number of tool call rounds.
func WithMaxIterations(n int) LoopOption {
	return func(l *Loop) {
		l.maxIterations = n
	}
}

// NewLoop creates a new tool conversation loop.
func NewLoop(executor *Executor, opts ...LoopOption) *Loop {
	l := &Loop{
		executor:      executor,
		maxIterations: 10,
	}
	for _, opt := range opts {
		opt(l)
	}
	return l
}

// Run executes the tool conversation loop.
func (l *Loop) Run(ctx context.Context, req *llm.ChatRequest, client ChatClient) (*llm.ChatResponse, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	messages := make([]llm.Message, len(req.Messages))
	copy(messages, req.Messages)

	currentReq := copyRequest(req, messages)
	var lastResp *llm.ChatResponse

	for i := 0; i < l.maxIterations; i++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		resp, err := client.Chat(ctx, currentReq)
		if err != nil {
			return nil, fmt.Errorf("llm chat failed: %w", err)
		}
		lastResp = resp

		if len(resp.Choices) == 0 {
			return resp, nil
		}

		choice := resp.Choices[0]
		if len(choice.Message.ToolCalls) == 0 {
			return resp, nil
		}

		calls := extractToolCalls(choice.Message.ToolCalls)
		results := l.executor.ExecuteParallel(ctx, calls)

		messages = append(messages, FormatToolCallsMessage(choice.Message.ToolCalls))
		messages = append(messages, FormatToolResults(results)...)

		currentReq = copyRequest(req, messages)
	}

	return lastResp, fmt.Errorf("%w", ErrMaxIterationsExceeded)
}

func extractToolCalls(calls []llm.ToolCall) []ToolCall {
	result := make([]ToolCall, len(calls))
	for i, c := range calls {
		result[i] = ToolCall{
			ID:        c.ID,
			Name:      c.Function.Name,
			Arguments: c.Function.Arguments,
		}
	}
	return result
}

func copyRequest(original *llm.ChatRequest, messages []llm.Message) *llm.ChatRequest {
	cpy := llm.DeepCopyRequest(original)
	cpy.Messages = messages
	return cpy
}
