package tools

import (
	"context"
	"sync"

	"dra-platform/backend/pkg/llm"
)

// StreamResult holds the outcome of processing a streamed response.
type StreamResult struct {
	Message     llm.Message
	ToolResults []ToolResult
	Done        bool
}

// StreamAccumulator collects stream chunks into a complete message.
type StreamAccumulator struct {
	mu           sync.Mutex
	role         llm.Role
	content      string
	toolCalls    []*llm.ToolCall
	finishReason *llm.FinishReason
}

// NewStreamAccumulator creates a new stream accumulator.
func NewStreamAccumulator() *StreamAccumulator {
	return &StreamAccumulator{
		toolCalls: make([]*llm.ToolCall, 0),
	}
}

// AddChunk adds a stream chunk to the accumulator.
func (a *StreamAccumulator) AddChunk(chunk llm.StreamChunk) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if chunk.Delta.Role != "" {
		a.role = chunk.Delta.Role
	}
	a.content += chunk.Delta.Content

	for _, tc := range chunk.Delta.ToolCalls {
		a.mergeToolCallDelta(tc)
	}

	if chunk.FinishReason != nil {
		a.finishReason = chunk.FinishReason
	}
}

// mergeToolCallDelta merges a partial tool call delta into the accumulated state.
func (a *StreamAccumulator) mergeToolCallDelta(delta llm.ToolCall) {
	if delta.ID != "" {
		// Match by ID when available for robust merging across chunks.
		for _, existing := range a.toolCalls {
			if existing.ID == delta.ID {
				applyToolCallDelta(existing, delta)
				return
			}
		}
		// New tool call with ID.
		a.toolCalls = append(a.toolCalls, &llm.ToolCall{
			ID:       delta.ID,
			Type:     delta.Type,
			Function: delta.Function,
		})
		return
	}

	// No ID: append to the last incomplete tool call, or create a new one.
	if len(a.toolCalls) > 0 {
		applyToolCallDelta(a.toolCalls[len(a.toolCalls)-1], delta)
	} else {
		a.toolCalls = append(a.toolCalls, &llm.ToolCall{
			Type:     delta.Type,
			Function: delta.Function,
		})
	}
}

// applyToolCallDelta applies non-zero fields from delta to an existing tool call.
func applyToolCallDelta(existing *llm.ToolCall, delta llm.ToolCall) {
	if delta.ID != "" {
		existing.ID = delta.ID
	}
	if delta.Type != "" {
		existing.Type = delta.Type
	}
	if delta.Function.Name != "" {
		existing.Function.Name = delta.Function.Name
	}
	if len(delta.Function.Arguments) > 0 {
		existing.Function.Arguments = append(existing.Function.Arguments, delta.Function.Arguments...)
	}
}

// Finalize returns the accumulated message and whether the stream is complete.
func (a *StreamAccumulator) Finalize() (llm.Message, bool) {
	a.mu.Lock()
	defer a.mu.Unlock()

	msg := llm.Message{
		Role:    a.role,
		Content: a.content,
	}

	if len(a.toolCalls) > 0 {
		calls := make([]llm.ToolCall, len(a.toolCalls))
		for i, tc := range a.toolCalls {
			calls[i] = *tc
		}
		msg.ToolCalls = calls
	}

	done := a.finishReason != nil
	return msg, done
}

// StreamHandler processes accumulated stream chunks and executes tools.
type StreamHandler struct {
	executor *Executor
}

// NewStreamHandler creates a new stream handler.
func NewStreamHandler(executor *Executor) *StreamHandler {
	return &StreamHandler{executor: executor}
}

// Handle processes a slice of stream chunks and executes any tool calls.
func (h *StreamHandler) Handle(ctx context.Context, chunks []llm.StreamChunk) (StreamResult, error) {
	acc := NewStreamAccumulator()
	for _, chunk := range chunks {
		acc.AddChunk(chunk)
	}

	msg, done := acc.Finalize()
	result := StreamResult{
		Message: msg,
		Done:    done,
	}

	if len(msg.ToolCalls) > 0 {
		calls := extractToolCalls(msg.ToolCalls)
		result.ToolResults = h.executor.ExecuteParallel(ctx, calls)
	}

	return result, nil
}
