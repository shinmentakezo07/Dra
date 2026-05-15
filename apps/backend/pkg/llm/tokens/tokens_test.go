package tokens

import (
	"testing"

	"dra-platform/backend/pkg/llm"
)

func TestTokenizer_Count(t *testing.T) {
	tests := []struct {
		name string
		text string
		want int
	}{
		{"empty", "", 0},
		{"single word", "hello", 1},
		{"sentence", "The quick brown fox jumps over the lazy dog", 10},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tok := NewTokenizer("gpt-4o")
			got := tok.Count(tt.text)
			if got != tt.want {
				t.Errorf("Count(%q) = %d, want %d", tt.text, got, tt.want)
			}
		})
	}
}

func TestTokenizer_ModelMultipliers(t *testing.T) {
	tests := []struct {
		model string
	}{
		{"gpt-4o"},
		{"gpt-4-turbo"},
		{"claude-sonnet-4"},
		{"o1-preview"},
		{"o3-mini"},
		{"unknown-model"},
	}
	for _, tt := range tests {
		tok := NewTokenizer(tt.model)
		if tok.modelMultiplier < 1.0 || tok.modelMultiplier > 1.2 {
			t.Errorf("NewTokenizer(%q) multiplier = %.2f, expected 1.0-1.2", tt.model, tok.modelMultiplier)
		}
	}
}

func TestTokenizer_CountMessages(t *testing.T) {
	tok := NewTokenizer("gpt-4o")
	msgs := []llm.Message{
		{Role: llm.RoleUser, Content: "hello"},
		{Role: llm.RoleAssistant, Content: "hi there"},
	}
	got := tok.CountMessages(msgs)
	wantOverhead := 4*len(msgs) + 2
	if got <= wantOverhead {
		t.Errorf("CountMessages() = %d, want > %d (overhead only)", got, wantOverhead)
	}

	if got := tok.CountMessages(nil); got != 0 {
		t.Errorf("CountMessages(nil) = %d, want 0", got)
	}
}

func TestTokenizer_CountRequest(t *testing.T) {
	tok := NewTokenizer("gpt-4o")
	req := &llm.ChatRequest{
		System: "You are a helpful assistant",
		Messages: []llm.Message{
			{Role: llm.RoleUser, Content: "hello"},
		},
		Tools: []llm.ToolDefinition{
			{Function: llm.ToolFunction{Name: "get_weather", Description: "Get weather"}},
		},
	}
	got := tok.CountRequest(req)
	if got <= 0 {
		t.Errorf("CountRequest() = %d, want > 0", got)
	}
}

func TestCostCalculator_Calculate(t *testing.T) {
	c := NewCostCalculator()

	tests := []struct {
		model       string
		inputTokens int
		outputToken int
		wantGT      float64
	}{
		{"openai/gpt-4o", 1000, 1000, 0.0125},
		{"openai/gpt-4o-mini", 1000, 1000, 0.00075},
		{"unknown-model", 1000, 1000, 0.008},
	}
	for _, tt := range tests {
		got := c.Calculate(tt.model, tt.inputTokens, tt.outputToken)
		if got <= 0 {
			t.Errorf("Calculate(%q) = %f, want > 0", tt.model, got)
		}
	}
}

func TestCostCalculator_CalculateCredits(t *testing.T) {
	c := NewCostCalculator()
	credits := c.CalculateCredits("openai/gpt-4o", 1000, 1000)
	if credits <= 0 {
		t.Errorf("CalculateCredits() = %d, want > 0", credits)
	}
}

func TestCostCalculator_GetContextWindow(t *testing.T) {
	c := NewCostCalculator()

	tests := []struct {
		model string
		want  int
	}{
		{"openai/gpt-4o", 128000},
		{"anthropic/claude-opus-4-20250514", 200000},
		{"unknown", 128000},
	}
	for _, tt := range tests {
		got := c.GetContextWindow(tt.model)
		if got != tt.want {
			t.Errorf("GetContextWindow(%q) = %d, want %d", tt.model, got, tt.want)
		}
	}
}

func TestPricingTable(t *testing.T) {
	if len(PricingTable) == 0 {
		t.Fatal("PricingTable is empty")
	}
	for id, p := range PricingTable {
		if p.InputPricePer1k <= 0 {
			t.Errorf("PricingTable[%q] InputPricePer1k = %f, want > 0", id, p.InputPricePer1k)
		}
		if p.OutputPricePer1k <= 0 {
			t.Errorf("PricingTable[%q] OutputPricePer1k = %f, want > 0", id, p.OutputPricePer1k)
		}
		if p.ContextWindow <= 0 {
			t.Errorf("PricingTable[%q] ContextWindow = %d, want > 0", id, p.ContextWindow)
		}
	}
}

func TestCountTokens(t *testing.T) {
	got := CountTokens("gpt-4o", "hello world")
	if got <= 0 {
		t.Errorf("CountTokens() = %d, want > 0", got)
	}
}

func TestCountRequestTokens(t *testing.T) {
	req := &llm.ChatRequest{
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "test"}},
	}
	got := CountRequestTokens("gpt-4o", req)
	if got <= 0 {
		t.Errorf("CountRequestTokens() = %d, want > 0", got)
	}
}
