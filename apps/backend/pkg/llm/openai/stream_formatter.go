package openai

import (
	"encoding/json"
	"fmt"
	"io"
	"time"
)

type StreamFormatter struct {
	writer io.Writer
	model  string
}

func NewStreamFormatter(w io.Writer, model string) *StreamFormatter {
	return &StreamFormatter{writer: w, model: model}
}

func (f *StreamFormatter) WriteChunk(content string) error {
	chunk := ChatCompletionChunk{
		ID:      generateStreamID(),
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
		ID:      generateStreamID(),
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
		ID:      generateStreamID(),
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
		ID:      generateStreamID(),
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
