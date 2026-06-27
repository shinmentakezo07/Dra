package anthropic

import (
	"encoding/json"
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestToInternalRequest_NilInput(t *testing.T) {
	req := ToInternalRequest(nil)
	if req == nil {
		t.Fatal("expected non-nil result")
	}
	if req.Model != "" {
		t.Error("expected empty model for nil input")
	}
}

func TestToInternalRequest_BasicMessage(t *testing.T) {
	content := json.RawMessage(`"Hello"`)
	req := ToInternalRequest(&MessageRequest{
		Model:     "claude-opus-4",
		MaxTokens: 1024,
		Messages: []Message{
			{Role: "user", Content: content},
		},
	})
	if req.Model != "claude-opus-4" {
		t.Errorf("model = %q, want claude-opus-4", req.Model)
	}
	if req.MaxTokens == nil || *req.MaxTokens != 1024 {
		t.Error("max_tokens not set correctly")
	}
	if len(req.Messages) != 1 {
		t.Fatalf("messages = %d, want 1", len(req.Messages))
	}
	if req.Messages[0].Role != llm.RoleUser {
		t.Errorf("role = %q, want user", req.Messages[0].Role)
	}
	if req.Messages[0].Content != "Hello" {
		t.Errorf("content = %q, want Hello", req.Messages[0].Content)
	}
}

func TestToInternalRequest_WithSystemPrompt(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model:  "claude-opus-4",
		System: "You are a helpful assistant.",
	})
	if req.System != "You are a helpful assistant." {
		t.Errorf("system = %q", req.System)
	}
}

func TestToInternalRequest_WithThinking(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
		Thinking: &ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: 16000,
		},
	})
	if req.Thinking == nil {
		t.Fatal("thinking config not set")
	}
	if !req.Thinking.Enabled {
		t.Error("thinking not enabled")
	}
	if req.Thinking.BudgetTokens != 16000 {
		t.Errorf("budget = %d, want 16000", req.Thinking.BudgetTokens)
	}
}

func TestToInternalRequest_WithTools(t *testing.T) {
	schema := json.RawMessage(`{"type": "object"}`)
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
		Tools: []ToolDef{
			{Name: "get_weather", Description: "Get weather", InputSchema: schema},
		},
	})
	if len(req.Tools) != 1 {
		t.Fatalf("tools = %d, want 1", len(req.Tools))
	}
	if req.Tools[0].Function.Name != "get_weather" {
		t.Errorf("tool name = %q", req.Tools[0].Function.Name)
	}
}

func TestToInternalRequest_WithToolChoice(t *testing.T) {
	tc := json.RawMessage(`{"type": "any"}`)
	req := ToInternalRequest(&MessageRequest{
		Model:      "claude-opus-4",
		ToolChoice: tc,
	})
	if req.ToolChoice != "any" {
		t.Errorf("tool_choice = %q, want any", req.ToolChoice)
	}
}

func TestToInternalRequest_WithStopSequences(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model:         "claude-opus-4",
		StopSequences: []string{"END", "STOP"},
	})
	if len(req.StopSequences) != 2 {
		t.Fatal("stop sequences not set")
	}
}

func TestToInternalRequest_EmptyMessages(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model:    "claude-opus-4",
		Messages: []Message{},
	})
	if len(req.Messages) != 0 {
		t.Error("expected empty messages")
	}
}

func TestToInternalRequest_MessagesContentBlock(t *testing.T) {
	content := json.RawMessage(`[{"type": "text", "text": "Hello block"}, {"type": "tool_use", "id": "tu1", "name": "test", "input": {"x": 1}}]`)
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
		Messages: []Message{
			{Role: "user", Content: content},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
	m := req.Messages[0]
	if m.Content != "Hello block" {
		t.Errorf("content = %q, want Hello block", m.Content)
	}
	if len(m.ContentBlocks) == 0 {
		t.Fatal("expected content blocks")
	}
	// First block should be text
	if m.ContentBlocks[0].Type != llm.ContentTypeText || m.ContentBlocks[0].Text != "Hello block" {
		t.Error("first block not text")
	}
	// Check tool_use block
	if len(m.ContentBlocks) < 2 {
		t.Fatal("expected tool_use block")
	}
	tu := m.ContentBlocks[1]
	if tu.Type != llm.ContentTypeToolUse || tu.ToolUse == nil {
		t.Fatal("second block not tool_use")
	}
	if tu.ToolUse.Name != "test" {
		t.Errorf("tool name = %q", tu.ToolUse.Name)
	}
}

func TestToInternalRequest_MessagesToolResult(t *testing.T) {
	content := json.RawMessage(`[{"type": "tool_result", "tool_use_id": "tu1", "content": "result data", "is_error": false}]`)
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
		Messages: []Message{
			{Role: "user", Content: content},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
	m := req.Messages[0]
	if m.ToolCallID != "tu1" {
		t.Errorf("tool_call_id = %q, want tu1", m.ToolCallID)
	}
	if m.Content != "result data" {
		t.Errorf("content = %q", m.Content)
	}
}

func TestFromInternalResponse_NilInput(t *testing.T) {
	resp := FromInternalResponse(nil)
	if resp == nil {
		t.Fatal("expected non-nil")
	}
	if resp.Type != "message" {
		t.Errorf("type = %q", resp.Type)
	}
}

func TestFromInternalResponse_Basic(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:           "msg_123",
		Model:        "claude-opus-4",
		Created:      1000,
		FinishReason: llm.FinishReasonStop,
		Choices: []llm.Choice{
			{
				Index: 0,
				Message: llm.Message{
					Role:    llm.RoleAssistant,
					Content: "Hello!",
				},
			},
		},
		Usage: llm.Usage{PromptTokens: 10, CompletionTokens: 20},
	})
	if resp.ID != "msg_123" {
		t.Errorf("id = %q", resp.ID)
	}
	if resp.Role != "assistant" {
		t.Errorf("role = %q", resp.Role)
	}
	if resp.StopReason != "end_turn" {
		t.Errorf("stop_reason = %q", resp.StopReason)
	}
	if len(resp.Content) != 1 {
		t.Fatalf("content blocks = %d", len(resp.Content))
	}
	if resp.Content[0].Type != "text" || resp.Content[0].Text != "Hello!" {
		t.Errorf("content block = %+v", resp.Content[0])
	}
	if resp.Usage.InputTokens != 10 || resp.Usage.OutputTokens != 20 {
		t.Error("usage mismatch")
	}
}

func TestFromInternalResponse_ToolCalls(t *testing.T) {
	args := json.RawMessage(`{"x": 1}`)
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:           "msg_1",
		Model:        "claude-opus-4",
		Created:      1000,
		FinishReason: llm.FinishReasonToolCalls,
		Choices: []llm.Choice{
			{
				Index: 0,
				Message: llm.Message{
					Role:    llm.RoleAssistant,
					Content: "Let me check...",
					ToolCalls: []llm.ToolCall{
						{ID: "tc1", Type: "function", Function: llm.ToolCallFunction{Name: "get_weather", Arguments: args}},
					},
				},
			},
		},
		Usage: llm.Usage{PromptTokens: 10, CompletionTokens: 5},
	})
	if resp.StopReason != "tool_use" {
		t.Errorf("stop_reason = %q, want tool_use", resp.StopReason)
	}
	if len(resp.Content) != 2 {
		t.Fatalf("content = %d blocks, want 2 (text + tool_use)", len(resp.Content))
	}
	if resp.Content[0].Type != "text" {
		t.Error("first block should be text")
	}
	if resp.Content[1].Type != "tool_use" || resp.Content[1].Name != "get_weather" {
		t.Errorf("second block = type=%s name=%s", resp.Content[1].Type, resp.Content[1].Name)
	}
}

func TestFromInternalResponse_ContentBlocks(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:           "msg_1",
		Model:        "claude-opus-4",
		FinishReason: llm.FinishReasonEndTurn,
		Choices: []llm.Choice{
			{
				Message: llm.Message{
					Role: llm.RoleAssistant,
					ContentBlocks: []llm.ContentBlock{
						{Type: llm.ContentTypeThinking, Thinking: "thinking text"},
						{Type: llm.ContentTypeText, Text: "result"},
					},
				},
			},
		},
	})
	if len(resp.Content) != 2 {
		t.Fatalf("content = %d", len(resp.Content))
	}
	if resp.Content[0].Type != "thinking" || resp.Content[0].Thinking != "thinking text" {
		t.Error("first block not thinking")
	}
	if resp.Content[1].Type != "text" || resp.Content[1].Text != "result" {
		t.Error("second block not text")
	}
}

func TestFromInternalResponse_EmptyChoices(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:      "msg_1",
		Model:   "claude-opus-4",
		Choices: []llm.Choice{},
	})
	if len(resp.Content) == 0 {
		t.Fatal("expected fallback content block")
	}
	if resp.Content[0].Type != "text" {
		t.Error("fallback should be text")
	}
}

func TestFromInternalResponse_ThinkingInResponse(t *testing.T) {
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:           "msg_1",
		Model:        "claude-opus-4",
		FinishReason: llm.FinishReasonStop,
		Thinking:     "deep thought",
		Choices: []llm.Choice{
			{
				Message: llm.Message{Role: llm.RoleAssistant, Content: "result"},
			},
		},
	})
	hasThinking := false
	for _, b := range resp.Content {
		if b.Type == "thinking" && b.Thinking == "deep thought" {
			hasThinking = true
			break
		}
	}
	if !hasThinking {
		t.Error("thinking block not found in response")
	}
}

func TestFromInternalStreamChunk_NilInput(t *testing.T) {
	events := FromInternalStreamChunk(nil, nil)
	if events != nil {
		t.Error("expected nil for nil chunk")
	}
}

func TestFromInternalStreamChunk_FirstTextChunk(t *testing.T) {
	events := FromInternalStreamChunk(&llm.StreamChunk{
		Index: 0,
		Delta: llm.Message{Content: "Hello"},
	}, nil)
	if len(events) != 2 {
		t.Fatalf("events = %d, want 2 (start + delta)", len(events))
	}
	if events[0].Type != "content_block_start" {
		t.Errorf("event[0] = %s, want content_block_start", events[0].Type)
	}
	if events[0].ContentBlock == nil || events[0].ContentBlock.Type != "text" {
		t.Error("content_block_start should be text type")
	}
	if events[1].Type != "content_block_delta" {
		t.Errorf("event[1] = %s, want content_block_delta", events[1].Type)
	}
	if events[1].Delta == nil || events[1].Delta.Text != "Hello" {
		t.Errorf("delta text = %v", events[1].Delta)
	}

	// Second call with state should NOT emit content_block_start
	state := &StreamingState{HasTextBlock: true}
	events2 := FromInternalStreamChunk(&llm.StreamChunk{
		Index: 0,
		Delta: llm.Message{Content: " world"},
	}, state)
	if len(events2) != 1 {
		t.Fatalf("events2 = %d, want 1 (delta only)", len(events2))
	}
	if events2[0].Type != "content_block_delta" {
		t.Errorf("event = %s, want delta", events2[0].Type)
	}
}

func TestFromInternalStreamChunk_FinishReason(t *testing.T) {
	state := &StreamingState{HasTextBlock: true}
	stop := llm.FinishReasonStop
	events := FromInternalStreamChunk(&llm.StreamChunk{
		Index:        0,
		FinishReason: &stop,
		Usage:        &llm.Usage{PromptTokens: 10, CompletionTokens: 20},
	}, state)
	if len(events) != 2 {
		t.Fatalf("events = %d, want 2 (stop + message_delta)", len(events))
	}
	if events[0].Type != "content_block_stop" {
		t.Errorf("event[0] = %s, want content_block_stop", events[0].Type)
	}
	if events[1].Type != "message_delta" {
		t.Errorf("event[1] = %s, want message_delta", events[1].Type)
	}
	if events[1].Delta == nil || events[1].Delta.StopReason != "end_turn" {
		t.Error("stop_reason missing")
	}
	if events[1].Usage == nil || events[1].Usage.InputTokens != 10 {
		t.Error("usage missing in message_delta")
	}
}

func TestFromInternalStreamChunk_ThinkingChunk(t *testing.T) {
	events := FromInternalStreamChunk(&llm.StreamChunk{
		Index:    0,
		Thinking: "thinking...",
	}, nil)
	if len(events) != 2 {
		t.Fatalf("events = %d, want 2 (start + delta)", len(events))
	}
	if events[0].Type != "content_block_start" || events[0].ContentBlock.Type != "thinking" {
		t.Error("first event should be thinking block start")
	}
	if events[1].Type != "content_block_delta" || events[1].Delta.Thinking != "thinking..." {
		t.Error("second event should be thinking delta")
	}
}

func TestFromInternalStreamChunk_ThinkingAndText(t *testing.T) {
	events := FromInternalStreamChunk(&llm.StreamChunk{
		Index:    0,
		Delta:    llm.Message{Content: "text"},
		Thinking: "thought",
	}, nil)
	if len(events) != 4 {
		t.Fatalf("events = %d, want 4 (text_start + text_delta + think_start + think_delta)", len(events))
	}
}

func TestFromInternalStreamChunk_FinishClosesBothBlocks(t *testing.T) {
	stop := llm.FinishReasonStop
	state := &StreamingState{HasTextBlock: true, HasThinkingBlock: true}
	events := FromInternalStreamChunk(&llm.StreamChunk{
		Index:        0,
		FinishReason: &stop,
	}, state)
	if len(events) != 3 {
		t.Fatalf("events = %d, want 3 (text_stop + think_stop + message_delta)", len(events))
	}
	if events[0].Type != "content_block_stop" || events[1].Type != "content_block_stop" {
		t.Error("should close both blocks")
	}
	if events[2].Type != "message_delta" {
		t.Error("final event should be message_delta")
	}
}

func TestAnthropicStopReason(t *testing.T) {
	tests := []struct {
		input llm.FinishReason
		want  string
	}{
		{llm.FinishReasonStop, "end_turn"},
		{llm.FinishReasonEndTurn, "end_turn"},
		{llm.FinishReasonLength, "max_tokens"},
		{llm.FinishReasonToolCalls, "tool_use"},
		{llm.FinishReasonContentFilter, "content_filter"},
		{llm.FinishReason("unknown"), "unknown"},
	}
	for _, tt := range tests {
		got := anthropicStopReason(tt.input)
		if got != tt.want {
			t.Errorf("anthropicStopReason(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestGenerateID(t *testing.T) {
	id1 := GenerateID()
	id2 := GenerateID()
	if id1 == id2 {
		t.Error("IDs should be unique")
	}
	if len(id1) < 10 {
		t.Errorf("ID too short: %q", id1)
	}
}

func TestToInternalRequest_StreamFlag(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model:  "claude-opus-4",
		Stream: true,
	})
	if !req.Stream {
		t.Error("stream not passed through")
	}
}

func TestToInternalRequest_TemperatureTopP(t *testing.T) {
	temp := 0.7
	topP := 0.9
	topK := 20
	req := ToInternalRequest(&MessageRequest{
		Model:       "claude-opus-4",
		Temperature: &temp,
		TopP:        &topP,
		TopK:        &topK,
	})
	if req.Temperature == nil || *req.Temperature != 0.7 {
		t.Error("temperature not set")
	}
	if req.TopP == nil || *req.TopP != 0.9 {
		t.Error("top_p not set")
	}
	if req.TopK == nil || *req.TopK != 20 {
		t.Error("top_k not set")
	}
}

func TestToInternalRequest_InvalidToolChoice(t *testing.T) {
	tc := json.RawMessage(`{"type": "tool", "name": "get_weather"}`)
	req := ToInternalRequest(&MessageRequest{
		Model:      "claude-opus-4",
		ToolChoice: tc,
	})
	if req.ToolChoice != "get_weather" {
		t.Errorf("tool_choice = %q, want get_weather", req.ToolChoice)
	}
}

func TestToInternalRequest_NilToolChoice(t *testing.T) {
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
	})
	if req.ToolChoice != "" {
		t.Error("tool_choice should be empty when not set")
	}
}

func TestToInternalRequest_MetadataField(t *testing.T) {
	// Test that metadata is a no-op (it's a field in the struct but not mapped to internal)
	meta := json.RawMessage(`{"user_id": "abc"}`)
	req := ToInternalRequest(&MessageRequest{
		Model:    "claude-opus-4",
		Metadata: meta,
	})
	if req.Model != "claude-opus-4" {
		t.Error("basic fields should still work with metadata set")
	}
}

func TestToInternalRequest_MessagesImageContent(t *testing.T) {
	content := json.RawMessage(`[{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "iVBORw0KGgo="}}]`)
	req := ToInternalRequest(&MessageRequest{
		Model: "claude-opus-4",
		Messages: []Message{
			{Role: "user", Content: content},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatal("expected 1 message")
	}
	if len(req.Messages[0].ContentBlocks) != 1 {
		t.Fatal("expected 1 content block")
	}
	img := req.Messages[0].ContentBlocks[0]
	if img.Type != llm.ContentTypeImage || img.ImageURL == nil {
		t.Fatal("expected image block")
	}
	if img.ImageURL.URL != "data:image/png;base64,iVBORw0KGgo=" {
		t.Errorf("image url = %q", img.ImageURL.URL)
	}
}

func TestFromInternalResponse_ToolCallsWithContentBlocks(t *testing.T) {
	args := json.RawMessage(`{}`)
	resp := FromInternalResponse(&llm.ChatResponse{
		ID:           "msg_1",
		Model:        "claude-opus-4",
		FinishReason: llm.FinishReasonToolCalls,
		Choices: []llm.Choice{
			{
				Message: llm.Message{
					Role:         llm.RoleAssistant,
					ContentBlocks: []llm.ContentBlock{
						{Type: llm.ContentTypeText, Text: "here:"},
						{Type: llm.ContentTypeToolUse, ToolUse: &llm.ToolUse{ID: "tu1", Name: "search", Input: args}},
					},
				},
			},
		},
	})
	if len(resp.Content) != 2 {
		t.Fatalf("content = %d", len(resp.Content))
	}
	if resp.Content[0].Type != "text" || resp.Content[0].Text != "here:" {
		t.Error("first block should be text")
	}
	if resp.Content[1].Type != "tool_use" || resp.Content[1].Name != "search" {
		t.Error("second block should be tool_use")
	}
}

func TestAnthropicUsage(t *testing.T) {
	u := anthropicUsage(&llm.Usage{PromptTokens: 10, CompletionTokens: 20, ThinkingTokens: 5})
	if u == nil {
		t.Fatal("expected non-nil")
	}
	if u.InputTokens != 10 || u.OutputTokens != 20 || u.ThinkingTokens != 5 {
		t.Error("usage fields mismatch")
	}
}

func TestAnthropicUsage_Nil(t *testing.T) {
	u := anthropicUsage(nil)
	if u != nil {
		t.Error("expected nil for nil input")
	}
}
