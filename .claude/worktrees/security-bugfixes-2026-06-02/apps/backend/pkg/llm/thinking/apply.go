package thinking

import (
	"log/slog"
	"strings"
)

// ApplyThinking is the unified entry point for applying thinking configuration.
//
// Processing order:
//  1. Parse suffix from model name
//  2. Extract config (suffix priority over body)
//  3. Validate against model capabilities
//  4. Apply using provider-specific applier
//
// Parameters:
//   - body: Request body as map (parsed JSON)
//   - model: Model name, optionally with suffix (e.g., "claude-sonnet-4-5(16384)")
//   - provider: Target provider format (openai, anthropic, gemini)
//   - support: Model's thinking capabilities (nil = no support)
//
// Returns modified body or original if no thinking config found.
func ApplyThinking(body map[string]interface{}, model string, provider string, support *ThinkingSupport) (map[string]interface{}, error) {
	if len(body) == 0 {
		return body, nil
	}

	provider = strings.ToLower(strings.TrimSpace(provider))

	// 1. Parse suffix
	suffixResult := ParseSuffix(model)

	// 2. Get config: suffix priority over body
	var config ThinkingConfig
	if suffixResult.HasSuffix {
		config = ParseSuffixToConfig(suffixResult.RawSuffix)
		slog.Debug("thinking: config from model suffix",
			"provider", provider, "model", model,
			"mode", config.Mode.String(), "budget", config.Budget, "level", string(config.Level))
	} else {
		config = ExtractConfig(body, provider)
		if config.HasConfig() {
			slog.Debug("thinking: config from request body",
				"provider", provider, "model", model,
				"mode", config.Mode.String(), "budget", config.Budget, "level", string(config.Level))
		}
	}

	// 3. No config found - passthrough
	if !config.HasConfig() {
		return body, nil
	}

	// 4. Model doesn't support thinking - strip config
	if support == nil {
		if config.Mode != ModeNone {
			slog.Debug("thinking: model does not support thinking, stripping",
				"provider", provider, "model", model)
			return StripConfig(body, provider), nil
		}
		return body, nil
	}

	// 5. Validate and normalize
	validated, err := ValidateConfig(config, support, suffixResult.HasSuffix)
	if err != nil {
		slog.Warn("thinking: validation failed",
			"provider", provider, "model", model, "error", err.Error())
		return body, err
	}

	if validated == nil {
		return body, nil
	}

	slog.Debug("thinking: processed config",
		"provider", provider, "model", model,
		"mode", validated.Mode.String(), "budget", validated.Budget, "level", string(validated.Level))

	// 6. Apply using provider applier
	applier := GetProviderApplier(provider)
	if applier == nil {
		slog.Debug("thinking: no applier for provider, passthrough", "provider", provider)
		return body, nil
	}

	return applier.Apply(body, *validated, support)
}

// ExtractReasoningEffort returns the thinking setting as a canonical label for logging.
func ExtractReasoningEffort(provider string, body map[string]interface{}, model string) string {
	// Check suffix first
	suffix := ParseSuffix(model)
	if suffix.HasSuffix {
		config := ParseSuffixToConfig(suffix.RawSuffix)
		return effortFromConfig(config)
	}

	config := ExtractConfig(body, provider)
	return effortFromConfig(config)
}

func effortFromConfig(config ThinkingConfig) string {
	if !config.HasConfig() {
		return ""
	}
	switch config.Mode {
	case ModeNone:
		return string(LevelNone)
	case ModeAuto:
		return string(LevelAuto)
	case ModeLevel:
		return strings.ToLower(string(config.Level))
	case ModeBudget:
		level, ok := ConvertBudgetToLevel(config.Budget)
		if !ok {
			return ""
		}
		return level
	default:
		return ""
	}
}
