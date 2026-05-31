// Package thinking provides unified thinking/reasoning configuration processing.
//
// It offers a unified interface for parsing, validating, and applying thinking
// configurations across AI providers (OpenAI, Anthropic, Gemini, Groq, xAI).
// Inspired by CLIProxyAPI's thinking architecture.
package thinking

// ThinkingMode represents the type of thinking configuration mode.
type ThinkingMode int

const (
	// ModeBudget indicates using a numeric token budget (e.g., suffix "(1000)").
	ModeBudget ThinkingMode = iota
	// ModeLevel indicates using a discrete effort level (e.g., suffix "(high)").
	ModeLevel
	// ModeNone indicates thinking is disabled.
	ModeNone
	// ModeAuto indicates automatic/dynamic thinking.
	ModeAuto
)

// String returns the string representation of ThinkingMode.
func (m ThinkingMode) String() string {
	switch m {
	case ModeBudget:
		return "budget"
	case ModeLevel:
		return "level"
	case ModeNone:
		return "none"
	case ModeAuto:
		return "auto"
	default:
		return "unknown"
	}
}

// ThinkingLevel represents a discrete thinking effort level.
type ThinkingLevel string

const (
	LevelNone    ThinkingLevel = "none"
	LevelAuto    ThinkingLevel = "auto"
	LevelMinimal ThinkingLevel = "minimal"
	LevelLow     ThinkingLevel = "low"
	LevelMedium  ThinkingLevel = "medium"
	LevelHigh    ThinkingLevel = "high"
	LevelXHigh   ThinkingLevel = "xhigh"
	LevelMax     ThinkingLevel = "max"
)

// ThinkingConfig represents a unified thinking configuration.
//
// Depending on Mode, either Budget or Level is effective:
//   - ModeNone: Budget=0, Level ignored
//   - ModeAuto: Budget=-1, Level ignored
//   - ModeBudget: Budget is a positive integer
//   - ModeLevel: Level is a valid ThinkingLevel
type ThinkingConfig struct {
	Mode   ThinkingMode  `json:"mode"`
	Budget int           `json:"budget,omitempty"`
	Level  ThinkingLevel `json:"level,omitempty"`
}

// HasConfig returns true if the config specifies any thinking configuration.
func (c ThinkingConfig) HasConfig() bool {
	return c.Mode != ModeBudget || c.Budget != 0 || c.Level != ""
}

// SuffixResult represents the result of parsing a model name for a thinking suffix.
//
// Suffix format: model-name(value) where value can be a numeric budget or level name.
type SuffixResult struct {
	// ModelName is the model name with suffix removed.
	ModelName string
	// HasSuffix indicates whether a valid suffix was found.
	HasSuffix bool
	// RawSuffix is the content inside the parentheses.
	RawSuffix string
}

// ThinkingSupport describes a model's thinking capabilities.
type ThinkingSupport struct {
	// Min is the minimum allowed thinking budget (token count).
	Min int `json:"min,omitempty"`
	// Max is the maximum allowed thinking budget.
	Max int `json:"max,omitempty"`
	// Levels is the list of supported discrete effort levels.
	Levels []string `json:"levels,omitempty"`
	// DynamicAllowed indicates whether auto/dynamic thinking is supported.
	DynamicAllowed bool `json:"dynamic_allowed,omitempty"`
	// ZeroAllowed indicates whether budget=0 (disabled) is allowed.
	ZeroAllowed bool `json:"zero_allowed,omitempty"`
}

// ProviderApplier defines the interface for provider-specific thinking application.
type ProviderApplier interface {
	// Apply applies thinking config to the request body map.
	Apply(body map[string]interface{}, config ThinkingConfig, support *ThinkingSupport) (map[string]interface{}, error)
}

// providerAppliers maps provider names to their applier implementations.
var providerAppliers = map[string]ProviderApplier{}

// RegisterProvider registers a provider applier by name.
func RegisterProvider(name string, applier ProviderApplier) {
	providerAppliers[name] = applier
}

// GetProviderApplier returns the applier for the given provider.
func GetProviderApplier(provider string) ProviderApplier {
	return providerAppliers[provider]
}
