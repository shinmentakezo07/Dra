// Package openai wraps the official OpenAI Go SDK v3.
// The SDK source code is vendored at vendor/github.com/openai/openai-go/.
// Usage: provides a simplified Go-native API for chat completions and streaming
// using the official OpenAI SDK internally.
package openai

import (
	"context"
	"fmt"

	oai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/shared"
)

// Client is the OpenAI API client wrapping the official SDK.
type Client struct {
	inner oai.Client
}

// NewClient creates a new OpenAI client with the given API key and optional base URL.
func NewClient(apiKey, baseURL string) *Client {
	opts := []option.RequestOption{option.WithAPIKey(apiKey)}
	if baseURL != "" {
		opts = append(opts, option.WithBaseURL(baseURL))
	}
	return &Client{inner: oai.NewClient(opts...)}
}

// ChatRequest holds parameters for a chat completion call.
type ChatRequest struct {
	Model    string
	Messages []ChatMessage
	Stream   bool
}

// ChatMessage represents a single message in a conversation.
type ChatMessage struct {
	Role    string
	Content string
}

// ChatResponse is a non-streaming chat completion response.
type ChatResponse struct {
	ID      string
	Object  string
	Created int64
	Model   string
	Choices []Choice
	Usage   Usage
}

// Choice represents one completion choice.
type Choice struct {
	Index        int
	Message      ChatMessage
	FinishReason string
}

// Usage contains token usage information.
type Usage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// StreamChunk is a single streaming response event.
type StreamChunk struct {
	ID      string
	Object  string
	Created int64
	Model   string
	Index   int
	Delta   ChatMessage
	Usage   *Usage
}

// Chat calls the chat completions API using the official OpenAI SDK.
func (c *Client) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	msgs := make([]oai.ChatCompletionMessageParamUnion, len(req.Messages))
	for i, m := range req.Messages {
		msgs[i] = oai.UserMessage(m.Content)
		if m.Role == "system" {
			msgs[i] = oai.DeveloperMessage(m.Content)
		} else if m.Role == "assistant" {
			msgs[i] = oai.AssistantMessage(m.Content)
		}
	}

	resp, err := c.inner.Chat.Completions.New(ctx, oai.ChatCompletionNewParams{
		Model:    shared.ChatModel(req.Model),
		Messages: msgs,
	})
	if err != nil {
		return nil, fmt.Errorf("openai: %w", err)
	}

	choices := make([]Choice, len(resp.Choices))
	for i, ch := range resp.Choices {
		choices[i] = Choice{
			Index: i,
			Message: ChatMessage{
				Role:    string(ch.Message.Role),
				Content: ch.Message.Content,
			},
			FinishReason: string(ch.FinishReason),
		}
	}

	return &ChatResponse{
		ID:      resp.ID,
		Object:  "chat.completion",
		Created: resp.Created,
		Model:   req.Model,
		Choices: choices,
		Usage: Usage{
			PromptTokens:     int(resp.Usage.PromptTokens),
			CompletionTokens: int(resp.Usage.CompletionTokens),
			TotalTokens:      int(resp.Usage.TotalTokens),
		},
	}, nil
}

// ChatStream calls the streaming chat completions API using the official OpenAI SDK.
func (c *Client) ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error) {
	msgs := make([]oai.ChatCompletionMessageParamUnion, len(req.Messages))
	for i, m := range req.Messages {
		msgs[i] = oai.UserMessage(m.Content)
		if m.Role == "system" {
			msgs[i] = oai.DeveloperMessage(m.Content)
		} else if m.Role == "assistant" {
			msgs[i] = oai.AssistantMessage(m.Content)
		}
	}

	stream := c.inner.Chat.Completions.NewStreaming(ctx, oai.ChatCompletionNewParams{
		Model:    shared.ChatModel(req.Model),
		Messages: msgs,
	})
	ch := make(chan StreamChunk, 64)
	go func() {
		defer close(ch)
		for stream.Next() {
			evt := stream.Current()
			for _, choice := range evt.Choices {
				chunk := StreamChunk{
					ID:      evt.ID,
					Object:  "chat.completion.chunk",
					Created: evt.Created,
					Model:   req.Model,
					Index:   int(choice.Index),
					Delta: ChatMessage{
						Role:    string(choice.Delta.Role),
						Content: choice.Delta.Content,
					},
				}
				select {
				case ch <- chunk:
				case <-ctx.Done():
					return
				}
			}
			if evt.Usage.TotalTokens > 0 || evt.Usage.PromptTokens > 0 || evt.Usage.CompletionTokens > 0 {
				u := &Usage{
					PromptTokens:     int(evt.Usage.PromptTokens),
					CompletionTokens: int(evt.Usage.CompletionTokens),
					TotalTokens:      int(evt.Usage.TotalTokens),
				}
				chunk := StreamChunk{
					ID: evt.ID, Object: "chat.completion.chunk",
					Created: evt.Created, Model: req.Model, Usage: u,
				}
				select {
				case ch <- chunk:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return ch, nil
}
