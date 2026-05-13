package translate

import (
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestValidateRequest_NilInput(t *testing.T) {
	err := ValidateRequest(nil)
	if err == nil {
		t.Fatal("expected error for nil input")
	}
	if err.Kind != KindNilInput {
		t.Errorf("kind = %d", err.Kind)
	}
}

func TestValidateRequest_EmptyModel(t *testing.T) {
	err := ValidateRequest(&llm.ChatRequest{Model: ""})
	if err == nil {
		t.Fatal("expected error for empty model")
	}
	if err.Kind != KindMissingRequired {
		t.Errorf("kind = %d", err.Kind)
	}
}

func TestValidateRequest_Valid(t *testing.T) {
	err := ValidateRequest(&llm.ChatRequest{Model: "gpt-4o"})
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestValidateResponse_NilInput(t *testing.T) {
	err := ValidateResponse(nil)
	if err == nil {
		t.Fatal("expected error for nil")
	}
	if err.Kind != KindNilInput {
		t.Errorf("kind = %d", err.Kind)
	}
}

func TestValidateResponse_Valid(t *testing.T) {
	err := ValidateResponse(&llm.ChatResponse{ID: "resp_1"})
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestValidateStreamChunk_NilInput(t *testing.T) {
	err := ValidateStreamChunk(nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateStreamChunk_Valid(t *testing.T) {
	err := ValidateStreamChunk(&llm.StreamChunk{ID: "chunk1"})
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestValidateMessages_Empty(t *testing.T) {
	err := ValidateMessages(nil)
	if err == nil {
		t.Fatal("expected error for nil messages")
	}
	if err.Kind != KindMissingRequired {
		t.Errorf("kind = %d", err.Kind)
	}

	err = ValidateMessages([]llm.Message{})
	if err == nil {
		t.Fatal("expected error for empty messages")
	}
}

func TestValidateMessages_EmptyRole(t *testing.T) {
	err := ValidateMessages([]llm.Message{
		{Role: "", Content: "hi"},
	})
	if err == nil {
		t.Fatal("expected error for empty role")
	}
	if err.Kind != KindInvalidMessage {
		t.Errorf("kind = %d", err.Kind)
	}
}

func TestValidateMessages_Valid(t *testing.T) {
	err := ValidateMessages([]llm.Message{
		{Role: llm.RoleUser, Content: "hi"},
		{Role: llm.RoleAssistant, Content: "hello"},
	})
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestContentBlockFromMap_Empty(t *testing.T) {
	_, err := ContentBlockFromMap(nil)
	if err == nil {
		t.Fatal("expected error for nil map")
	}

	_, err = ContentBlockFromMap(map[string]interface{}{})
	if err == nil {
		t.Fatal("expected error for empty map")
	}
}

func TestContentBlockFromMap_MissingType(t *testing.T) {
	_, err := ContentBlockFromMap(map[string]interface{}{"text": "hello"})
	if err == nil {
		t.Fatal("expected error for missing type")
	}
}

func TestContentBlockFromMap_Text(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type": "text",
		"text": "hello",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cb.Type != llm.ContentTypeText || cb.Text != "hello" {
		t.Errorf("block = %+v", cb)
	}
}

func TestContentBlockFromMap_Image(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type": "image",
		"source": map[string]interface{}{
			"type":       "base64",
			"media_type": "image/png",
			"data":       "iVBORw0KGgo=",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cb.Type != llm.ContentTypeImage || cb.ImageURL == nil {
		t.Fatal("expected image block")
	}
	if cb.ImageURL.URL != "data:image/png;base64,iVBORw0KGgo=" {
		t.Errorf("url = %q", cb.ImageURL.URL)
	}
}

func TestContentBlockFromMap_ImageMissingSource(t *testing.T) {
	_, err := ContentBlockFromMap(map[string]interface{}{
		"type": "image",
	})
	if err == nil {
		t.Fatal("expected error for image without source")
	}
}

func TestContentBlockFromMap_ToolUse(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type": "tool_use",
		"id":   "tu1",
		"name": "search",
		"input": map[string]interface{}{
			"query": "test",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cb.Type != llm.ContentTypeToolUse || cb.ToolUse == nil {
		t.Fatal("expected tool_use block")
	}
	if cb.ToolUse.ID != "tu1" || cb.ToolUse.Name != "search" {
		t.Error("tool use fields")
	}
}

func TestContentBlockFromMap_ToolResult(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type":        "tool_result",
		"tool_use_id": "tu1",
		"content":     "result data",
		"is_error":    false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cb.Type != llm.ContentTypeToolResult || cb.ToolResult == nil {
		t.Fatal("expected tool_result block")
	}
	if cb.ToolResult.ToolUseID != "tu1" || cb.ToolResult.Content != "result data" {
		t.Error("tool result fields")
	}
	if cb.ToolResult.IsError {
		t.Error("is_error should be false")
	}
}

func TestContentBlockFromMap_ToolResultError(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type":        "tool_result",
		"tool_use_id": "tu1",
		"content":     "error msg",
		"is_error":    true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !cb.ToolResult.IsError {
		t.Error("is_error should be true")
	}
}

func TestContentBlockFromMap_ToolResultContentArray(t *testing.T) {
	cb, err := ContentBlockFromMap(map[string]interface{}{
		"type":        "tool_result",
		"tool_use_id": "tu1",
		"content": []interface{}{
			map[string]interface{}{"type": "text", "text": "part1"},
			map[string]interface{}{"type": "text", "text": "part2"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cb.ToolResult.Content != "part1part2" {
		t.Errorf("content = %q", cb.ToolResult.Content)
	}
}

func TestIntStr(t *testing.T) {
	tests := []struct {
		input int
		want  string
	}{
		{0, "0"},
		{1, "1"},
		{10, "10"},
		{100, "100"},
		{999, "999"},
	}
	for _, tt := range tests {
		got := intStr(tt.input)
		if got != tt.want {
			t.Errorf("intStr(%d) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
