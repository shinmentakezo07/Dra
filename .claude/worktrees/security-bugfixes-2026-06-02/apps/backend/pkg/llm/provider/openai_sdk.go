package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"time"

	"dra-platform/backend/pkg/llm"
	"github.com/sashabaranov/go-openai"
)

// toOpenAIMessage converts an llm.Message to an OpenAI SDK message.
func toOpenAIMessage(m llm.Message) openai.ChatCompletionMessage {
	msg := openai.ChatCompletionMessage{
		Role:    string(m.Role),
		Content: m.Content,
	}
	if len(m.ToolCalls) > 0 {
		msg.ToolCalls = make([]openai.ToolCall, len(m.ToolCalls))
		for i, tc := range m.ToolCalls {
			msg.ToolCalls[i] = openai.ToolCall{
				ID:   tc.ID,
				Type: openai.ToolType(tc.Type),
				Function: openai.FunctionCall{
					Name:      tc.Function.Name,
					Arguments: string(tc.Function.Arguments),
				},
			}
		}
	}
	if m.ToolCallID != "" {
		msg.ToolCallID = m.ToolCallID
	}
	return msg
}

// toOpenAIRequest converts an llm.ChatRequest to an OpenAI SDK request.
func toOpenAIRequest(req *llm.ChatRequest) openai.ChatCompletionRequest {
	messages := make([]openai.ChatCompletionMessage, 0, len(req.Messages)+1)
	if req.System != "" {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: req.System,
		})
	}
	for _, m := range req.Messages {
		if m.Role == llm.RoleSystem && req.System != "" {
			continue
		}
		messages = append(messages, toOpenAIMessage(m))
	}

	chatReq := openai.ChatCompletionRequest{
		Model:    req.Model,
		Messages: messages,
		Stream:   req.Stream,
	}
	if req.Temperature != nil {
		chatReq.Temperature = float32(*req.Temperature)
	}
	if req.MaxTokens != nil {
		chatReq.MaxTokens = *req.MaxTokens
	}
	if req.TopP != nil {
		chatReq.TopP = float32(*req.TopP)
	}
	if len(req.StopSequences) > 0 {
		chatReq.Stop = req.StopSequences
	}
	if len(req.Tools) > 0 {
		chatReq.Tools = make([]openai.Tool, len(req.Tools))
		for i, t := range req.Tools {
			chatReq.Tools[i] = openai.Tool{
				Type: openai.ToolType(t.Type),
				Function: &openai.FunctionDefinition{
					Name:        t.Function.Name,
					Description: t.Function.Description,
					Parameters:  t.Function.Parameters,
				},
			}
		}
	}
	if req.ToolChoice != "" {
		chatReq.ToolChoice = req.ToolChoice
	}
	// Bug #54: map Thinking config to ReasoningEffort for o1/o3 models
	if req.Thinking != nil && req.Thinking.Enabled && llm.IsThinkingModel(req.Model) {
		effort := "medium"
		switch {
		case req.Thinking.BudgetTokens > 16000:
			effort = "high"
		case req.Thinking.BudgetTokens < 4000:
			effort = "low"
		}
		chatReq.ReasoningEffort = effort
	}
	return chatReq
}

// fromOpenAIResponse converts an OpenAI SDK response to llm.ChatResponse.
func fromOpenAIResponse(resp openai.ChatCompletionResponse, model, provider string) *llm.ChatResponse {
	choices := make([]llm.Choice, len(resp.Choices))
	for i, c := range resp.Choices {
		msg := llm.Message{
			Role:    llm.Role(c.Message.Role),
			Content: c.Message.Content,
		}
		if len(c.Message.ToolCalls) > 0 {
			msg.ToolCalls = make([]llm.ToolCall, len(c.Message.ToolCalls))
			for j, tc := range c.Message.ToolCalls {
				msg.ToolCalls[j] = llm.ToolCall{
					ID:   tc.ID,
					Type: string(tc.Type),
					Function: llm.ToolCallFunction{
						Name:      tc.Function.Name,
						Arguments: json.RawMessage(tc.Function.Arguments),
					},
				}
			}
		}
		choices[i] = llm.Choice{
			Index:        i,
			Message:      msg,
			FinishReason: llm.FinishReason(c.FinishReason),
		}
	}

	finishReason := llm.FinishReasonStop
	if len(choices) > 0 {
		finishReason = choices[0].FinishReason
	}

	return &llm.ChatResponse{
		ID:           resp.ID,
		Object:       resp.Object,
		Created:      resp.Created,
		Model:        model,
		Provider:     provider,
		Choices:      choices,
		FinishReason: finishReason,
		Usage: llm.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}
}

// fromOpenAIStreamChunk converts an OpenAI SDK stream chunk to llm.StreamChunk.
func fromOpenAIStreamChunk(chunk openai.ChatCompletionStreamResponse, model, provider string) *llm.StreamChunk {
	if len(chunk.Choices) == 0 {
		if chunk.Usage != nil {
			return &llm.StreamChunk{
				ID:       chunk.ID,
				Object:   chunk.Object,
				Created:  chunk.Created,
				Model:    model,
				Provider: provider,
				Usage: &llm.Usage{
					PromptTokens:     chunk.Usage.PromptTokens,
					CompletionTokens: chunk.Usage.CompletionTokens,
					TotalTokens:      chunk.Usage.TotalTokens,
				},
			}
		}
		return nil
	}

	choice := chunk.Choices[0]
	delta := llm.Message{
		Role:    llm.Role(choice.Delta.Role),
		Content: choice.Delta.Content,
	}
	if len(choice.Delta.ToolCalls) > 0 {
		delta.ToolCalls = make([]llm.ToolCall, len(choice.Delta.ToolCalls))
		for i, tc := range choice.Delta.ToolCalls {
			delta.ToolCalls[i] = llm.ToolCall{
				ID:   tc.ID,
				Type: string(tc.Type),
				Function: llm.ToolCallFunction{
					Name:      tc.Function.Name,
					Arguments: json.RawMessage(tc.Function.Arguments),
				},
			}
		}
	}

	var usage *llm.Usage
	if chunk.Usage != nil {
		usage = &llm.Usage{
			PromptTokens:     chunk.Usage.PromptTokens,
			CompletionTokens: chunk.Usage.CompletionTokens,
			TotalTokens:      chunk.Usage.TotalTokens,
		}
	}

	var finishReason *llm.FinishReason
	if choice.FinishReason != "" {
		fr := llm.FinishReason(choice.FinishReason)
		finishReason = &fr
	}

	return &llm.StreamChunk{
		ID:           chunk.ID,
		Object:       chunk.Object,
		Created:      chunk.Created,
		Model:        model,
		Provider:     provider,
		Index:        choice.Index,
		Delta:        delta,
		FinishReason: finishReason,
		Usage:        usage,
	}
}

// chatWithSDK performs a non-streaming chat using the OpenAI SDK.
func chatWithSDK(ctx context.Context, p *BaseProvider, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("%s: API key not configured", p.name)
	}

	// Check cache
	if p.cache != nil {
		key := llm.CacheKey(req)
		if cached, err := p.cache.Get(ctx, key); err == nil && cached != nil {
			return cached, nil
		}
	}

	chatReq := toOpenAIRequest(req)
	resp, err := p.openaiClient.CreateChatCompletion(ctx, chatReq)
	if err != nil {
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, fmt.Errorf("%s: request failed: %w", p.name, err)
	}

	result := fromOpenAIResponse(resp, req.Model, p.name)

	// Cache response
	if p.cache != nil {
		key := llm.CacheKey(req)
		if err := p.cache.Set(ctx, key, result, 5*time.Minute); err != nil {
			slog.Warn("cache_write_failed", "key", key, "error", err.Error())
		}
	}

	return result, nil
}

// chatStreamWithSDK performs a streaming chat using the OpenAI SDK.
func chatStreamWithSDK(ctx context.Context, p *BaseProvider, req *llm.ChatRequest) (
	<-chan llm.StreamChunk, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("%s: API key not configured", p.name)
	}

	chatReq := toOpenAIRequest(req)
	stream, err := p.openaiClient.CreateChatCompletionStream(ctx, chatReq)
	if err != nil {
		if p.watcher != nil {
			p.watcher.Watch(ctx, err, p.name, req.Model, "")
		}
		return nil, fmt.Errorf("%s: request failed: %w", p.name, err)
	}

	ch := make(chan llm.StreamChunk, 64)
	go func() {
		defer close(ch)
		defer stream.Close()

		for {
			resp, err := stream.Recv()
			if err != nil {
				if err != io.EOF {
					slog.Error("stream_recv_error", "provider", p.name, "model", req.Model, "error", err)
				}
				return
			}
			chunk := fromOpenAIStreamChunk(resp, req.Model, p.name)
			if chunk == nil {
				continue
			}
			select {
			case ch <- *chunk:
			case <-ctx.Done():
				return
			}
		}
	}()

	return ch, nil
}
