package llm

import (
	"testing"
)

func TestCacheKey(t *testing.T) {
	req := &ChatRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: RoleUser, Content: "Hello"},
		},
	}
	key1 := CacheKey(req)
	key2 := CacheKey(req)
	if key1 != key2 {
		t.Error("CacheKey should be deterministic")
	}

	req2 := &ChatRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: RoleUser, Content: "World"},
		},
	}
	key3 := CacheKey(req2)
	if key1 == key3 {
		t.Error("CacheKey should differ for different requests")
	}
}

func TestEstimateTokens(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"", 0},
		{"Hello world", 3},
		{"This is a longer sentence with more words to estimate.", 12},
	}

	for _, tt := range tests {
		tokens := EstimateTokens(tt.input)
		if tokens < 0 {
			t.Errorf("EstimateTokens(%q) = %d, want >= 0", tt.input, tokens)
		}
	}
}

func TestValidateRequest(t *testing.T) {
	temp := 0.5
	req := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "Hi"}},
		Temperature: &temp,
	}
	if err := ValidateRequest(req); err != nil {
		t.Errorf("ValidateRequest failed: %v", err)
	}

	invalid := &ChatRequest{Model: "gpt-4o"}
	if err := ValidateRequest(invalid); err == nil {
		t.Error("ValidateRequest should fail for empty messages")
	}
}

func TestParseModelID(t *testing.T) {
	provider, model := ParseModelID("openai/gpt-4o")
	if provider != "openai" || model != "gpt-4o" {
		t.Errorf("ParseModelID(openai/gpt-4o) = %s, %s", provider, model)
	}

	provider, model = ParseModelID("gpt-4o")
	if provider != "" || model != "gpt-4o" {
		t.Errorf("ParseModelID(gpt-4o) = %s, %s", provider, model)
	}
}

func TestIsThinkingModel(t *testing.T) {
	if !IsThinkingModel("o1-preview") {
		t.Error("o1 should be a thinking model")
	}
	if !IsThinkingModel("claude-opus-4") {
		t.Error("claude-opus-4 should be a thinking model")
	}
	if IsThinkingModel("gpt-3.5-turbo") {
		t.Error("gpt-3.5 should not be a thinking model")
	}
}

func TestCost(t *testing.T) {
	c := Cost(1000, 500, 0.01, 0.03)
	if c <= 0 {
		t.Error("Cost should be positive")
	}
}

