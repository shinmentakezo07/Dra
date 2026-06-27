package thinking

import (
	"strconv"
	"strings"
)

// ParseSuffix extracts a thinking suffix from a model name.
//
// Format: model-name(value)
// Examples:
//   - "claude-sonnet-4-5(16384)" -> ModelName="claude-sonnet-4-5", RawSuffix="16384"
//   - "gpt-4o(high)" -> ModelName="gpt-4o", RawSuffix="high"
//   - "gemini-2.5-pro" -> ModelName="gemini-2.5-pro", HasSuffix=false
func ParseSuffix(model string) SuffixResult {
	lastOpen := strings.LastIndex(model, "(")
	if lastOpen == -1 || !strings.HasSuffix(model, ")") {
		return SuffixResult{ModelName: model, HasSuffix: false}
	}

	return SuffixResult{
		ModelName: model[:lastOpen],
		HasSuffix: true,
		RawSuffix: model[lastOpen+1 : len(model)-1],
	}
}

// ParseNumericSuffix parses a raw suffix as a numeric budget value.
// Only non-negative integers are valid.
func ParseNumericSuffix(rawSuffix string) (budget int, ok bool) {
	if rawSuffix == "" {
		return 0, false
	}
	value, err := strconv.Atoi(rawSuffix)
	if err != nil || value < 0 {
		return 0, false
	}
	return value, true
}

// ParseSpecialSuffix parses special mode values: "none", "auto", "-1".
func ParseSpecialSuffix(rawSuffix string) (mode ThinkingMode, ok bool) {
	if rawSuffix == "" {
		return ModeBudget, false
	}
	switch strings.ToLower(rawSuffix) {
	case "none":
		return ModeNone, true
	case "auto", "-1":
		return ModeAuto, true
	default:
		return ModeBudget, false
	}
}

// ParseLevelSuffix parses a raw suffix as a discrete thinking level.
// Valid levels: minimal, low, medium, high, xhigh, max.
func ParseLevelSuffix(rawSuffix string) (level ThinkingLevel, ok bool) {
	if rawSuffix == "" {
		return "", false
	}
	switch strings.ToLower(rawSuffix) {
	case "minimal":
		return LevelMinimal, true
	case "low":
		return LevelLow, true
	case "medium":
		return LevelMedium, true
	case "high":
		return LevelHigh, true
	case "xhigh":
		return LevelXHigh, true
	case "max":
		return LevelMax, true
	default:
		return "", false
	}
}

// ParseSuffixToConfig converts a raw suffix string to ThinkingConfig.
func ParseSuffixToConfig(rawSuffix string) ThinkingConfig {
	// 1. Special values
	if mode, ok := ParseSpecialSuffix(rawSuffix); ok {
		switch mode {
		case ModeNone:
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		case ModeAuto:
			return ThinkingConfig{Mode: ModeAuto, Budget: -1}
		}
	}

	// 2. Level names
	if level, ok := ParseLevelSuffix(rawSuffix); ok {
		return ThinkingConfig{Mode: ModeLevel, Level: level}
	}

	// 3. Numeric values
	if budget, ok := ParseNumericSuffix(rawSuffix); ok {
		if budget == 0 {
			return ThinkingConfig{Mode: ModeNone, Budget: 0}
		}
		return ThinkingConfig{Mode: ModeBudget, Budget: budget}
	}

	return ThinkingConfig{}
}
