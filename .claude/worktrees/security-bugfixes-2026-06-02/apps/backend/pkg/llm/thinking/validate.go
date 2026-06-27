package thinking

import "fmt"

// ModelCapability describes thinking format support.
type ModelCapability int

const (
	CapabilityNone       ModelCapability = iota // No thinking support
	CapabilityBudgetOnly                        // Numeric budgets only (Claude, Gemini 2.5)
	CapabilityLevelOnly                         // Discrete levels only (OpenAI, Groq)
	CapabilityHybrid                            // Both budgets and levels
)

// DetectModelCapability determines a model's thinking capability.
func DetectModelCapability(support *ThinkingSupport) ModelCapability {
	if support == nil {
		return CapabilityNone
	}
	hasBudget := support.Min > 0 || support.Max > 0
	hasLevels := len(support.Levels) > 0
	switch {
	case hasBudget && hasLevels:
		return CapabilityHybrid
	case hasBudget:
		return CapabilityBudgetOnly
	case hasLevels:
		return CapabilityLevelOnly
	default:
		return CapabilityNone
	}
}

// ValidateConfig validates and normalizes a thinking config against model capabilities.
//
// Auto-conversion:
//   - Budget-only model + Level config -> Level converted to Budget
//   - Level-only model + Budget config -> Budget converted to Level
//   - Hybrid model -> preserve original format
//
// Returns normalized config or ThinkingError.
func ValidateConfig(config ThinkingConfig, support *ThinkingSupport, fromSuffix bool) (*ThinkingConfig, error) {
	if support == nil {
		if config.Mode != ModeNone {
			return nil, NewThinkingError(ErrThinkingNotSupported, "thinking not supported for this model")
		}
		return &config, nil
	}

	capability := DetectModelCapability(support)

	// Auto-convert between budget and level based on model capability
	switch capability {
	case CapabilityBudgetOnly:
		if config.Mode == ModeLevel && config.Level != LevelAuto {
			budget, ok := ConvertLevelToBudget(string(config.Level))
			if !ok {
				return nil, NewThinkingError(ErrUnknownLevel, fmt.Sprintf("unknown level: %s", config.Level))
			}
			config.Mode = ModeBudget
			config.Budget = budget
			config.Level = ""
		}
	case CapabilityLevelOnly:
		if config.Mode == ModeBudget {
			level, ok := ConvertBudgetToLevel(config.Budget)
			if !ok {
				return nil, NewThinkingError(ErrUnknownLevel,
					fmt.Sprintf("budget %d cannot be converted to a valid level", config.Budget))
			}
			config.Mode = ModeLevel
			config.Level = ClampLevel(ThinkingLevel(level), support.Levels)
			config.Budget = 0
		}
	}

	// Normalize special modes
	if config.Mode == ModeLevel && config.Level == LevelNone {
		config.Mode = ModeNone
		config.Budget = 0
		config.Level = ""
	}
	if config.Mode == ModeLevel && config.Level == LevelAuto {
		config.Mode = ModeAuto
		config.Budget = -1
		config.Level = ""
	}
	if config.Mode == ModeBudget && config.Budget == 0 {
		config.Mode = ModeNone
		config.Level = ""
	}

	// Validate level against supported levels
	if len(support.Levels) > 0 && config.Mode == ModeLevel {
		if !HasLevel(support.Levels, string(config.Level)) {
			config.Level = ClampLevel(config.Level, support.Levels)
			if !HasLevel(support.Levels, string(config.Level)) {
				return nil, errLevelNotSupported(string(config.Level), support.Levels)
			}
		}
	}

	// Validate budget range (only for same-format, non-suffix configs)
	if !fromSuffix && config.Mode == ModeBudget {
		min, max := support.Min, support.Max
		if min != 0 || max != 0 {
			if config.Budget < min || config.Budget > max {
				return nil, errBudgetOutOfRange(config.Budget, min, max)
			}
		}
	}

	// Convert auto to mid-range if dynamic not allowed
	if config.Mode == ModeAuto && !support.DynamicAllowed {
		config = convertAutoToMidRange(config, support)
	}

	// Clamp budget
	if config.Mode == ModeBudget || config.Mode == ModeAuto || config.Mode == ModeNone {
		config.Budget = ClampBudget(config.Budget, support)
	}

	return &config, nil
}

// convertAutoToMidRange converts ModeAuto to a fixed value when dynamic is not supported.
func convertAutoToMidRange(config ThinkingConfig, support *ThinkingSupport) ThinkingConfig {
	// Level-only models: use medium
	if len(support.Levels) > 0 && support.Min == 0 && support.Max == 0 {
		config.Mode = ModeLevel
		config.Level = LevelMedium
		config.Budget = 0
		return config
	}

	// Budget models: use mid-range
	mid := (support.Min + support.Max) / 2
	if mid <= 0 && support.ZeroAllowed {
		config.Mode = ModeNone
		config.Budget = 0
	} else if mid <= 0 {
		config.Mode = ModeBudget
		config.Budget = support.Min
	} else {
		config.Mode = ModeBudget
		config.Budget = mid
	}
	return config
}
