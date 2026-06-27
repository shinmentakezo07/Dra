// Package anthropic wraps the official Anthropic Go SDK.
// The SDK source code is vendored at vendor/github.com/anthropics/anthropic-sdk-go/.
package anthropic

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// Client wraps the official Anthropic SDK client.
type Client struct {
	inner anthropic.Client
}

// NewClient creates a new Anthropic API client.
func NewClient(apiKey string) *Client {
	return &Client{
		inner: anthropic.NewClient(option.WithAPIKey(apiKey)),
	}
}

// MessageRequest holds parameters for creating a message.
type MessageRequest struct {
	Model     string
	Messages  []MessageParam
	System    string
	MaxTokens int
	Stream    bool
}

// MessageParam represents a single message in the conversation.
type MessageParam struct {
	Role    string
	Content string
}

// MessageResponse represents an Anthropic Messages API response.
type MessageResponse struct {
	ID         string
	Type       string
	Role       string
	Content    []ContentBlock
	Model      string
	StopReason string
	Usage      Usage
}

// ContentBlock represents a content block in a response.
type ContentBlock struct {
	Type string
	Text string
}

// Usage contains token counts.
type Usage struct {
	InputTokens  int
	OutputTokens int
}

// CreateMessage calls the Messages API using the official Anthropic SDK.
func (c *Client) CreateMessage(ctx context.Context, req *MessageRequest) (*MessageResponse, error) {
	maxTokens := int64(req.MaxTokens)
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	msgs := make([]anthropic.MessageParam, len(req.Messages))
	for i, m := range req.Messages {
		if m.Role == "assistant" {
			msgs[i] = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content))
		} else {
			msgs[i] = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content))
		}
	}

	resp, err := c.inner.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(req.Model),
		MaxTokens: maxTokens,
		Messages:  msgs,
	})
	if err != nil {
		return nil, fmt.Errorf("anthropic: %w", err)
	}

	blocks := make([]ContentBlock, len(resp.Content))
	for i, b := range resp.Content {
		blocks[i] = ContentBlock{Type: string(b.Type), Text: b.Text}
	}

	return &MessageResponse{
		ID:         resp.ID,
		Type:       "message",
		Role:       string(resp.Role),
		Content:    blocks,
		Model:      req.Model,
		StopReason: string(resp.StopReason),
		Usage: Usage{
			InputTokens:  int(resp.Usage.InputTokens),
			OutputTokens: int(resp.Usage.OutputTokens),
		},
	}, nil
}

// StreamEvent is a streaming event from the Anthropic SDK.
type StreamEvent struct {
	Type  string
	Index int
	Delta *StreamDelta
}

// StreamDelta contains streaming message deltas.
type StreamDelta struct {
	Type       string
	Text       string
	StopReason string
}

// CreateMessageStream calls the streaming Messages API.
func (c *Client) CreateMessageStream(ctx context.Context, req *MessageRequest) (<-chan StreamEvent, error) {
	maxTokens := int64(req.MaxTokens)
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	msgs := make([]anthropic.MessageParam, len(req.Messages))
	for i, m := range req.Messages {
		if m.Role == "assistant" {
			msgs[i] = anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content))
		} else {
			msgs[i] = anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content))
		}
	}

	stream := c.inner.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(req.Model),
		MaxTokens: maxTokens,
		Messages:  msgs,
	})
	ch := make(chan StreamEvent, 64)
	go func() {
		defer close(ch)
		for stream.Next() {
			evt := stream.Current()
			event := StreamEvent{Type: string(evt.Type)}
			switch string(evt.Type) {
			case "content_block_start":
				event.Index = int(evt.Index)
				event.Delta = &StreamDelta{Type: "text_delta", Text: evt.ContentBlock.Text}
			case "content_block_delta":
				event.Index = int(evt.Index)
				event.Delta = &StreamDelta{Type: "text_delta", Text: string(evt.Delta.Text)}
			case "message_delta":
				event.Delta = &StreamDelta{
					Type:       "message_delta",
					StopReason: string(evt.Delta.StopReason),
				}
			}
			select {
			case ch <- event:
			case <-ctx.Done():
				return
			}
		}
	}()
	return ch, nil
}
