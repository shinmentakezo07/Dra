package openai

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"
)

// StreamFormatter writes OpenAI-compatible SSE chunks.
// For new code, prefer pkg/llm/streaming.OpenAIStreamWriter which supports
// tool calls, thinking, and error events.
type StreamFormatter struct {
	writer  io.Writer
	model   string
	mu      sync.Mutex
	counter int
}

func NewStreamFormatter(w io.Writer, model string) *StreamFormatter {
	return &StreamFormatter{writer: w, model: model}
}

func (f *StreamFormatter) nextID() string {
	f.counter++
	return fmt.Sprintf("chatcmpl-%d-%d", time.Now().UnixNano(), f.counter)
}

func (f *StreamFormatter) WriteChunk(content string) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index: 0,
			Delta: ChatMessage{
				Content: content,
			},
		}},
	}
	return f.writeEvent(chunk)
}

func (f *StreamFormatter) WriteRole(role string) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index: 0,
			Delta: ChatMessage{
				Role: role,
			},
		}},
	}
	return f.writeEvent(chunk)
}

func (f *StreamFormatter) WriteFinish(reason string) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index:        0,
			Delta:        ChatMessage{},
			FinishReason: &reason,
		}},
	}
	if err := f.writeEvent(chunk); err != nil {
		return err
	}
	_, err := fmt.Fprintf(f.writer, "data: [DONE]\n\n")
	return err
}

func (f *StreamFormatter) WriteUsage(promptTokens, completionTokens int) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{},
		Usage: &Usage{
			PromptTokens:     promptTokens,
			CompletionTokens: completionTokens,
			TotalTokens:      promptTokens + completionTokens,
		},
	}
	return f.writeEvent(chunk)
}

// WriteToolCallStart writes a tool call start chunk with the function name.
func (f *StreamFormatter) WriteToolCallStart(callID, functionName string) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index: 0,
			Delta: ChatMessage{
				Role: "assistant",
				ToolCalls: []ToolCall{{
					ID:   callID,
					Type: "function",
					Function: ToolCallFunction{
						Name: functionName,
					},
				}},
			},
		}},
	}
	return f.writeEvent(chunk)
}

// WriteToolCallDelta writes a tool call arguments delta chunk.
func (f *StreamFormatter) WriteToolCallDelta(callIndex int, arguments string) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index: 0,
			Delta: ChatMessage{
				ToolCalls: []ToolCall{{
					Index: callIndex,
					Function: ToolCallFunction{
						Arguments: arguments,
					},
				}},
			},
		}},
	}
	return f.writeEvent(chunk)
}

// WriteReasoning writes a reasoning_content delta for o1/o3 models.
func (f *StreamFormatter) WriteReasoning(reasoning string) error {
	chunk := map[string]interface{}{
		"id":      f.nextID(),
		"object":  "chat.completion.chunk",
		"created": time.Now().Unix(),
		"model":   f.model,
		"choices": []map[string]interface{}{{
			"index": 0,
			"delta": map[string]interface{}{
				"reasoning_content": reasoning,
			},
		}},
	}
	return f.writeEvent(chunk)
}

// WriteError writes a mid-stream error chunk.
func (f *StreamFormatter) WriteError(code, message string) error {
	chunk := map[string]interface{}{
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
	return f.writeEvent(chunk)
}

// WriteFinishWithUsage writes the finish event with usage stats then [DONE].
func (f *StreamFormatter) WriteFinishWithUsage(reason string, promptTokens, completionTokens int) error {
	chunk := ChatCompletionChunk{
		ID:      f.nextID(),
		Object:  "chat.completion.chunk",
		Created: time.Now().Unix(),
		Model:   f.model,
		Choices: []ChunkChoice{{
			Index:        0,
			Delta:        ChatMessage{},
			FinishReason: &reason,
		}},
		Usage: &Usage{
			PromptTokens:     promptTokens,
			CompletionTokens: completionTokens,
			TotalTokens:      promptTokens + completionTokens,
		},
	}
	if err := f.writeEvent(chunk); err != nil {
		return err
	}
	_, err := fmt.Fprintf(f.writer, "data: [DONE]\n\n")
	return err
}

func (f *StreamFormatter) writeEvent(v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(f.writer, "data: %s\n\n", data)
	return err
}

func generateStreamID() string {
	return fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
}
