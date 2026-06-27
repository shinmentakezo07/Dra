package thinking

import (
	"encoding/json"
	"strings"
)

// ExtractConfig extracts provider-specific thinking config from a request body map.
// The body parameter should be the parsed JSON request as map[string]interface{}.
func ExtractConfig(body map[string]interface{}, provider string) ThinkingConfig {
	if len(body) == 0 {
		return ThinkingConfig{}
	}

	switch strings.ToLower(provider) {
	case "anthropic", "claude":
		return extractAnthropicConfig(body)
	case "openai":
		return extractOpenAIConfig(body)
	case "gemini":
		return extractGeminiConfig(body)
	default:
		return ThinkingConfig{}
	}
}

// extractAnthropicConfig extracts thinking config from Anthropic format.
//
// Anthropic format:
//   - thinking.type: "enabled" or "disabled"
//   - thinking.budget_tokens: integer
//   - thinking: { type: "enabled", budget_tokens: N }
func extractAnthropicConfig(body map[string]interface{}) ThinkingConfig {
	thinkingRaw, ok := body["thinking"]
	if !ok {
		return ThinkingConfig{}
	}

	thinking, ok := thinkingRaw.(map[string]interface{})
	if !ok {
		return ThinkingConfig{}
	}

	// Check type field
	if typ, ok := thinking["type"].(string); ok {
		if typ == "disabled" {
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		}
	}

	// Check budget_tokens
	if budget, ok := toInt(thinking["budget_tokens"]); ok {
		switch {
		case budget == 0:
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case budget == -1:
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		default:
			return ThinkingConfig{Mode: ModeBudget, Budget: budget}
		}
	}

	// type="enabled" without budget -> auto
	if typ, ok := thinking["type"].(string); ok && typ == "enabled" {
		return ThinkingConfig{Mode: ModeAuto, Budget: -1}
	}

	return ThinkingConfig{}
}

// extractOpenAIConfig extracts thinking config from OpenAI format.
//
// OpenAI format: reasoning_effort: "none"|"low"|"medium"|"high"
func extractOpenAIConfig(body map[string]interface{}) ThinkingConfig {
	effort, ok := body["reasoning_effort"].(string)
	if !ok {
		return ThinkingConfig{}
	}

	if effort == "none" {
		return ThinkingConfig{Mode: ModeNone, Budget: 0}
	}
	return ThinkingConfig{Mode: ModeLevel, Level: ThinkingLevel(effort)}
}

// extractGeminiConfig extracts thinking config from Gemini format.
//
// Gemini format:
//   - generationConfig.thinkingConfig.thinkingBudget: integer
//   - generationConfig.thinkingConfig.thinkingLevel: string
func extractGeminiConfig(body map[string]interface{}) ThinkingConfig {
	genConfig, ok := body["generationConfig"].(map[string]interface{})
	if !ok {
		return ThinkingConfig{}
	}

	thinkingConfig, ok := genConfig["thinkingConfig"].(map[string]interface{})
	if !ok {
		return ThinkingConfig{}
	}

	// Check thinkingLevel first (Gemini 3 format)
	if level, ok := thinkingConfig["thinkingLevel"].(string); ok {
		switch level {
		case "none":
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case "auto":
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		default:
			return ThinkingConfig{Mode: ModeLevel, Level: ThinkingLevel(level)}
		}
	}

	// Also check snake_case (Google Python SDK)
	if level, ok := thinkingConfig["thinking_level"].(string); ok {
		switch level {
		case "none":
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case "auto":
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		default:
			return ThinkingConfig{Mode: ModeLevel, Level: ThinkingLevel(level)}
		}
	}

	// Check thinkingBudget (Gemini 2.5 format)
	if budget, ok := toInt(thinkingConfig["thinkingBudget"]); ok {
		switch {
		case budget == 0:
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case budget == -1:
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		default:
			return ThinkingConfig{Mode: ModeBudget, Budget: budget}
		}
	}

	// Also check snake_case
	if budget, ok := toInt(thinkingConfig["thinking_budget"]); ok {
		switch {
		case budget == 0:
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case budget == -1:
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		default:
			return ThinkingConfig{Mode: ModeBudget, Budget: budget}
		}
	}

	return ThinkingConfig{}
}

// toInt converts various numeric types to int.
func toInt(v interface{}) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case int64:
		return int(n), true
	case float64:
		return int(n), true
	case json.Number:
		i, err := n.Int64()
		if err != nil {
			return 0, false
		}
		return int(i), true
	default:
		return 0, false
	}
}
