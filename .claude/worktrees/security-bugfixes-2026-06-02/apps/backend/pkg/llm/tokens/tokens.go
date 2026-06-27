package tokens

import (
	"math"
	"sort"
	"strings"
	"unicode/utf8"

	"dra-platform/backend/pkg/llm"
)

// ModelPricing holds pricing information for a model.
type ModelPricing struct {
	InputPricePer1k  float64
	OutputPricePer1k float64
	ContextWindow    int
}

// PricingTable contains known model prices.
var PricingTable = map[string]ModelPricing{
	"openai/gpt-4o":              {InputPricePer1k: 0.0025, OutputPricePer1k: 0.01, ContextWindow: 128000},
	"openai/gpt-4o-mini":         {InputPricePer1k: 0.00015, OutputPricePer1k: 0.0006, ContextWindow: 128000},
	"openai/gpt-4.1":             {InputPricePer1k: 0.002, OutputPricePer1k: 0.008, ContextWindow: 256000},
	"openai/o3-mini":             {InputPricePer1k: 0.0011, OutputPricePer1k: 0.0044, ContextWindow: 200000},
	"openai/o1":                  {InputPricePer1k: 0.015, OutputPricePer1k: 0.06, ContextWindow: 200000},
	"anthropic/claude-sonnet-4-20250514": {InputPricePer1k: 0.003, OutputPricePer1k: 0.015, ContextWindow: 200000},
	"anthropic/claude-opus-4-20250514":   {InputPricePer1k: 0.015, OutputPricePer1k: 0.075, ContextWindow: 200000},
	"anthropic/claude-3-5-haiku-20241022": {InputPricePer1k: 0.0008, OutputPricePer1k: 0.004, ContextWindow: 200000},
}

// Tokenizer provides model-aware token counting.
type Tokenizer struct {
	modelMultiplier float64
}

// NewTokenizer creates a tokenizer for a specific model.
func NewTokenizer(model string) *Tokenizer {
	mult := 1.0
	lower := strings.ToLower(model)
	switch {
	case strings.Contains(lower, "gpt-4o"):
		mult = 1.0
	case strings.Contains(lower, "gpt-4"):
		mult = 1.05
	case strings.Contains(lower, "claude"):
		mult = 1.1
	case strings.Contains(lower, "o1"), strings.Contains(lower, "o3"):
		mult = 1.15
	default:
		mult = 1.0
	}
	return &Tokenizer{modelMultiplier: mult}
}

// Count estimates token count for text.
func (t *Tokenizer) Count(text string) int {
	if text == "" {
		return 0
	}

	// Character-based estimate: ~4 chars per token for English
	charEstimate := utf8.RuneCountInString(text) / 4

	// Word-based estimate: ~0.75 words per token
	words := strings.Fields(text)
	wordEstimate := int(float64(len(words)) * 1.33)

	// Code blocks have higher token density
	codeBlocks := strings.Count(text, "```")
	if codeBlocks > 0 {
		wordEstimate = int(float64(wordEstimate) * 1.2)
	}

	// Average of estimates, adjusted by model multiplier
	avg := (charEstimate + wordEstimate) / 2
	adjusted := int(float64(avg) * t.modelMultiplier)

	if adjusted < 1 {
		adjusted = 1
	}
	return adjusted
}

// CountMessages estimates tokens for a slice of messages including overhead.
func (t *Tokenizer) CountMessages(messages []llm.Message) int {
	total := 0
	for _, m := range messages {
		total += t.Count(m.Content)
		// Per-message overhead (role, formatting)
		total += 4
	}
	// Conversation overhead
	if len(messages) > 0 {
		total += 2
	}
	return total
}

// CountRequest estimates total tokens for a request.
func (t *Tokenizer) CountRequest(req *llm.ChatRequest) int {
	total := t.CountMessages(req.Messages)
	if req.System != "" {
		total += t.Count(req.System) + 4
	}
	if len(req.Tools) > 0 {
		for _, tool := range req.Tools {
			total += t.Count(tool.Function.Name)
			total += t.Count(tool.Function.Description)
			total += 20 // schema overhead
		}
	}
	return total
}

// CostCalculator calculates request costs.
type CostCalculator struct{}

// NewCostCalculator creates a cost calculator.
func NewCostCalculator() *CostCalculator {
	return &CostCalculator{}
}

// sortedModelKeys returns PricingTable keys sorted by length descending for deterministic longest-prefix matching.
func sortedModelKeys() []string {
	keys := make([]string, 0, len(PricingTable))
	for k := range PricingTable {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})
	return keys
}

// Calculate returns the cost in USD for given tokens and model.
func (c *CostCalculator) Calculate(model string, inputTokens, outputTokens int) float64 {
	pricing, ok := PricingTable[model]
	if !ok {
		for _, id := range sortedModelKeys() {
			if strings.HasSuffix(id, "/"+model) || strings.HasPrefix(id, model) {
				pricing = PricingTable[id]
				ok = true
				break
			}
		}
	}
	if !ok {
		// Default pricing
		pricing = ModelPricing{InputPricePer1k: 0.002, OutputPricePer1k: 0.006, ContextWindow: 128000}
	}

	inputCost := float64(inputTokens) * pricing.InputPricePer1k / 1000
	outputCost := float64(outputTokens) * pricing.OutputPricePer1k / 1000
	return math.Round((inputCost+outputCost)*1e6) / 1e6
}

// CalculateCredits returns cost in internal credit units.
func (c *CostCalculator) CalculateCredits(model string, inputTokens, outputTokens int) int {
	usd := c.Calculate(model, inputTokens, outputTokens)
	// 1 USD = 1,000,000 credits
	return int(math.Round(usd * 1e6))
}

// GetContextWindow returns the context window for a model.
func (c *CostCalculator) GetContextWindow(model string) int {
	pricing, ok := PricingTable[model]
	if ok {
		return pricing.ContextWindow
	}
	for _, id := range sortedModelKeys() {
		if strings.HasSuffix(id, "/"+model) || strings.HasPrefix(id, model) {
			return PricingTable[id].ContextWindow
		}
	}
	return 128000
}

// CountTokens is a convenience function using default tokenizer.
func CountTokens(model, text string) int {
	return NewTokenizer(model).Count(text)
}

// CountRequestTokens is a convenience function.
func CountRequestTokens(model string, req *llm.ChatRequest) int {
	return NewTokenizer(model).CountRequest(req)
}
