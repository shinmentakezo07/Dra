package streaming

import (
	"context"
	"io"
	"sync"

	"dra-platform/backend/pkg/llm"
)

// StreamPump reads from a StreamChunk channel and writes through a StreamWriter.
// It handles all the formatting details for tool calls, thinking, and content.
type StreamPump struct {
	writer StreamWriter
}

// NewStreamPump creates a new stream pump.
func NewStreamPump(w StreamWriter) *StreamPump {
	return &StreamPump{writer: w}
}

// Pump reads all chunks from ch and writes them through the writer.
// Returns the accumulated message and usage.
func (p *StreamPump) Pump(ctx context.Context, ch <-chan llm.StreamChunk) (llm.Message, *llm.Usage, error) {
	acc := NewAccumulator()
	var lastUsage *llm.Usage

	for {
		select {
		case chunk, ok := <-ch:
			if !ok {
				// Channel closed — write finish
				msg, _ := acc.Message()
				if err := p.writer.WriteFinish(acc.FinishReason(), lastUsage); err != nil {
					return msg, lastUsage, err
				}
				p.writer.Flush()
				return msg, lastUsage, nil
			}

			acc.Add(chunk)

			// Track usage from chunks
			if chunk.Usage != nil {
				lastUsage = chunk.Usage
			}

			// Write the chunk in the target format
			if err := p.writeChunk(chunk); err != nil {
				msg, _ := acc.Message()
				return msg, lastUsage, err
			}
			p.writer.Flush()

		case <-ctx.Done():
			msg, _ := acc.Message()
			return msg, lastUsage, ctx.Err()
		}
	}
}

// writeChunk routes a single chunk to the appropriate writer method.
func (p *StreamPump) writeChunk(chunk llm.StreamChunk) error {
	// Write thinking delta
	if chunk.Thinking != "" {
		if err := p.writer.WriteThinking(chunk.Thinking); err != nil {
			return err
		}
	}

	// Write tool call deltas
	for _, tc := range chunk.Delta.ToolCalls {
		if tc.ID != "" {
			// New tool call starting
			if err := p.writer.WriteToolCallStart(&tc); err != nil {
				return err
			}
		}
		if len(tc.Function.Arguments) > 0 {
			if err := p.writer.WriteToolCallDelta(0, string(tc.Function.Arguments)); err != nil {
				return err
			}
		}
	}

	// Write content delta
	if chunk.Delta.Content != "" {
		if err := p.writer.WriteChunk(&chunk); err != nil {
			return err
		}
	}

	// Write finish
	if chunk.FinishReason != nil {
		if err := p.writer.WriteFinish(*chunk.FinishReason, chunk.Usage); err != nil {
			return err
		}
	}

	return nil
}

// Accumulator collects stream chunks into a complete message.
type Accumulator struct {
	mu           sync.Mutex
	role         llm.Role
	content      string
	thinking     string
	toolCalls    []*llm.ToolCall
	finishReason llm.FinishReason
	usage        *llm.Usage
}

// NewAccumulator creates a new stream accumulator.
func NewAccumulator() *Accumulator {
	return &Accumulator{
		toolCalls: make([]*llm.ToolCall, 0),
	}
}

// Add adds a stream chunk to the accumulator.
func (a *Accumulator) Add(chunk llm.StreamChunk) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if chunk.Delta.Role != "" {
		a.role = chunk.Delta.Role
	}
	a.content += chunk.Delta.Content
	a.thinking += chunk.Thinking

	for _, tc := range chunk.Delta.ToolCalls {
		a.mergeToolCall(tc)
	}

	if chunk.FinishReason != nil {
		a.finishReason = *chunk.FinishReason
	}
	if chunk.Usage != nil {
		a.usage = chunk.Usage
	}
}

// mergeToolCall merges a tool call delta into accumulated state.
func (a *Accumulator) mergeToolCall(delta llm.ToolCall) {
	if delta.ID != "" {
		for _, existing := range a.toolCalls {
			if existing.ID == delta.ID {
				applyDelta(existing, delta)
				return
			}
		}
		a.toolCalls = append(a.toolCalls, &llm.ToolCall{
			ID:       delta.ID,
			Type:     delta.Type,
			Function: delta.Function,
		})
		return
	}

	if len(a.toolCalls) > 0 {
		applyDelta(a.toolCalls[len(a.toolCalls)-1], delta)
	} else {
		a.toolCalls = append(a.toolCalls, &llm.ToolCall{
			Type:     delta.Type,
			Function: delta.Function,
		})
	}
}

func applyDelta(existing *llm.ToolCall, delta llm.ToolCall) {
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

// Message returns the accumulated message and whether the stream is complete.
func (a *Accumulator) Message() (llm.Message, bool) {
	a.mu.Lock()
	defer a.mu.Unlock()

	msg := llm.Message{
		Role:    a.role,
		Content: a.content,
	}
	if a.thinking != "" {
		msg.ContentBlocks = append(msg.ContentBlocks, llm.ContentBlock{
			Type:     llm.ContentTypeThinking,
			Thinking: a.thinking,
		})
	}
	if len(a.toolCalls) > 0 {
		calls := make([]llm.ToolCall, len(a.toolCalls))
		for i, tc := range a.toolCalls {
			calls[i] = *tc
		}
		msg.ToolCalls = calls
	}

	return msg, a.finishReason != ""
}

// FinishReason returns the accumulated finish reason.
func (a *Accumulator) FinishReason() llm.FinishReason {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.finishReason
}

// Usage returns the accumulated usage.
func (a *Accumulator) Usage() *llm.Usage {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.usage
}

// Content returns the accumulated text content.
func (a *Accumulator) Content() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.content
}

// NewWriterFromIO creates a StreamWriter for the given format using an io.Writer.
func NewWriterFromIO(w io.Writer, format Format, model string) StreamWriter {
	switch format {
	case FormatOpenAI:
		return NewOpenAIStreamWriter(w, model)
	case FormatAnthropic:
		return NewAnthropicStreamWriter(w, model)
	default:
		return NewInternalStreamWriter(w)
	}
}
