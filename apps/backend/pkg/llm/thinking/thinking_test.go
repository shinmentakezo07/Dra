package thinking

import (
	"testing"
)

func TestParseSuffix(t *testing.T) {
	tests := []struct {
		model    string
		wantName string
		wantHas  bool
		wantRaw  string
	}{
		{"claude-sonnet-4-5(16384)", "claude-sonnet-4-5", true, "16384"},
		{"gpt-4o(high)", "gpt-4o", true, "high"},
		{"gemini-2.5-pro", "gemini-2.5-pro", false, ""},
		{"model(none)", "model", true, "none"},
		{"model(auto)", "model", true, "auto"},
		{"model(-1)", "model", true, "-1"},
		{"model", "model", false, ""},
		{"model(invalid(extra)", "model(invalid", true, "extra"},
	}

	for _, tt := range tests {
		result := ParseSuffix(tt.model)
		if result.ModelName != tt.wantName {
			t.Errorf("ParseSuffix(%q).ModelName = %q, want %q", tt.model, result.ModelName, tt.wantName)
		}
		if result.HasSuffix != tt.wantHas {
			t.Errorf("ParseSuffix(%q).HasSuffix = %v, want %v", tt.model, result.HasSuffix, tt.wantHas)
		}
		if result.RawSuffix != tt.wantRaw {
			t.Errorf("ParseSuffix(%q).RawSuffix = %q, want %q", tt.model, result.RawSuffix, tt.wantRaw)
		}
	}
}

func TestParseSuffixToConfig(t *testing.T) {
	tests := []struct {
		raw      string
		wantMode ThinkingMode
		wantBudg int
		wantLev  ThinkingLevel
	}{
		{"none", ModeNone, 0, ""},
		{"auto", ModeAuto, -1, ""},
		{"-1", ModeAuto, -1, ""},
		{"high", ModeLevel, 0, LevelHigh},
		{"medium", ModeLevel, 0, LevelMedium},
		{"8192", ModeBudget, 8192, ""},
		{"0", ModeNone, 0, ""},
		{"unknown", ModeBudget, 0, ""},
	}

	for _, tt := range tests {
		config := ParseSuffixToConfig(tt.raw)
		if config.Mode != tt.wantMode {
			t.Errorf("ParseSuffixToConfig(%q).Mode = %v, want %v", tt.raw, config.Mode, tt.wantMode)
		}
		if config.Budget != tt.wantBudg {
			t.Errorf("ParseSuffixToConfig(%q).Budget = %d, want %d", tt.raw, config.Budget, tt.wantBudg)
		}
		if config.Level != tt.wantLev {
			t.Errorf("ParseSuffixToConfig(%q).Level = %q, want %q", tt.raw, config.Level, tt.wantLev)
		}
	}
}

func TestConvertLevelToBudget(t *testing.T) {
	tests := []struct {
		level string
		want  int
		ok    bool
	}{
		{"none", 0, true},
		{"auto", -1, true},
		{"minimal", 512, true},
		{"low", 1024, true},
		{"medium", 8192, true},
		{"high", 24576, true},
		{"xhigh", 32768, true},
		{"max", 128000, true},
		{"unknown", 0, false},
	}

	for _, tt := range tests {
		budget, ok := ConvertLevelToBudget(tt.level)
		if ok != tt.ok || budget != tt.want {
			t.Errorf("ConvertLevelToBudget(%q) = (%d, %v), want (%d, %v)", tt.level, budget, ok, tt.want, tt.ok)
		}
	}
}

func TestConvertBudgetToLevel(t *testing.T) {
	tests := []struct {
		budget int
		want   string
		ok     bool
	}{
		{-1, "auto", true},
		{0, "none", true},
		{256, "minimal", true},
		{512, "minimal", true},
		{1024, "low", true},
		{4096, "medium", true},
		{8192, "medium", true},
		{16384, "high", true},
		{24576, "high", true},
		{32768, "xhigh", true},
		{-2, "", false},
	}

	for _, tt := range tests {
		level, ok := ConvertBudgetToLevel(tt.budget)
		if ok != tt.ok || level != tt.want {
			t.Errorf("ConvertBudgetToLevel(%d) = (%q, %v), want (%q, %v)", tt.budget, level, ok, tt.want, tt.ok)
		}
	}
}

func TestExtractOpenAIConfig(t *testing.T) {
	tests := []struct {
		body     map[string]interface{}
		wantMode ThinkingMode
		wantLev  ThinkingLevel
	}{
		{map[string]interface{}{"reasoning_effort": "high"}, ModeLevel, LevelHigh},
		{map[string]interface{}{"reasoning_effort": "none"}, ModeNone, ""},
		{map[string]interface{}{}, ModeBudget, ""},
	}

	for _, tt := range tests {
		config := ExtractConfig(tt.body, "openai")
		if config.Mode != tt.wantMode {
			t.Errorf("ExtractConfig(openai).Mode = %v, want %v", config.Mode, tt.wantMode)
		}
		if config.Level != tt.wantLev {
			t.Errorf("ExtractConfig(openai).Level = %q, want %q", config.Level, tt.wantLev)
		}
	}
}

func TestExtractAnthropicConfig(t *testing.T) {
	tests := []struct {
		body     map[string]interface{}
		wantMode ThinkingMode
		wantBudg int
	}{
		{
			map[string]interface{}{"thinking": map[string]interface{}{"type": "enabled", "budget_tokens": 16384}},
			ModeBudget, 16384,
		},
		{
			map[string]interface{}{"thinking": map[string]interface{}{"type": "disabled"}},
			ModeNone, 0,
		},
		{
			map[string]interface{}{"thinking": map[string]interface{}{"type": "enabled"}},
			ModeAuto, -1,
		},
		{
			map[string]interface{}{},
			ModeBudget, 0,
		},
	}

	for _, tt := range tests {
		config := ExtractConfig(tt.body, "anthropic")
		if config.Mode != tt.wantMode {
			t.Errorf("ExtractConfig(anthropic).Mode = %v, want %v", config.Mode, tt.wantMode)
		}
		if config.Budget != tt.wantBudg {
			t.Errorf("ExtractConfig(anthropic).Budget = %d, want %d", config.Budget, tt.wantBudg)
		}
	}
}

func TestExtractGeminiConfig(t *testing.T) {
	tests := []struct {
		body     map[string]interface{}
		wantMode ThinkingMode
		wantBudg int
		wantLev  ThinkingLevel
	}{
		{
			map[string]interface{}{
				"generationConfig": map[string]interface{}{
					"thinkingConfig": map[string]interface{}{"thinkingBudget": 8192},
				},
			},
			ModeBudget, 8192, "",
		},
		{
			map[string]interface{}{
				"generationConfig": map[string]interface{}{
					"thinkingConfig": map[string]interface{}{"thinkingLevel": "high"},
				},
			},
			ModeLevel, 0, LevelHigh,
		},
	}

	for _, tt := range tests {
		config := ExtractConfig(tt.body, "gemini")
		if config.Mode != tt.wantMode {
			t.Errorf("ExtractConfig(gemini).Mode = %v, want %v", config.Mode, tt.wantMode)
		}
		if config.Budget != tt.wantBudg {
			t.Errorf("ExtractConfig(gemini).Budget = %d, want %d", config.Budget, tt.wantBudg)
		}
		if config.Level != tt.wantLev {
			t.Errorf("ExtractConfig(gemini).Level = %q, want %q", config.Level, tt.wantLev)
		}
	}
}

func TestValidateConfig(t *testing.T) {
	// Budget-only model (like Claude)
	claudeSupport := &ThinkingSupport{Min: 1024, Max: 100000, ZeroAllowed: true}

	// Level config should be auto-converted to budget
	config := ThinkingConfig{Mode: ModeLevel, Level: LevelHigh}
	validated, err := ValidateConfig(config, claudeSupport, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if validated.Mode != ModeBudget {
		t.Errorf("expected ModeBudget, got %v", validated.Mode)
	}
	if validated.Budget != 24576 {
		t.Errorf("expected budget 24576, got %d", validated.Budget)
	}

	// Level-only model (like OpenAI)
	openaiSupport := &ThinkingSupport{Levels: []string{"low", "medium", "high"}}

	// Budget config should be auto-converted to level
	config = ThinkingConfig{Mode: ModeBudget, Budget: 8192}
	validated, err = ValidateConfig(config, openaiSupport, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if validated.Mode != ModeLevel {
		t.Errorf("expected ModeLevel, got %v", validated.Mode)
	}

	// Unsupported thinking
	noSupport := (*ThinkingSupport)(nil)
	config = ThinkingConfig{Mode: ModeBudget, Budget: 1000}
	_, err = ValidateConfig(config, noSupport, false)
	if err == nil {
		t.Error("expected error for unsupported thinking")
	}
}

func TestClampBudget(t *testing.T) {
	support := &ThinkingSupport{Min: 1024, Max: 50000, ZeroAllowed: true}

	tests := []struct {
		value int
		want  int
	}{
		{0, 0},         // ZeroAllowed
		{-1, -1},       // Auto passes through
		{500, 1024},    // Below min
		{5000, 5000},   // In range
		{100000, 50000}, // Above max
	}

	for _, tt := range tests {
		got := ClampBudget(tt.value, support)
		if got != tt.want {
			t.Errorf("ClampBudget(%d) = %d, want %d", tt.value, got, tt.want)
		}
	}
}

func TestStripConfig(t *testing.T) {
	body := map[string]interface{}{
		"model":           "gpt-4o",
		"reasoning_effort": "high",
		"messages":        []interface{}{},
	}

	result := StripConfig(body, "openai")
	if _, exists := result["reasoning_effort"]; exists {
		t.Error("expected reasoning_effort to be stripped")
	}
	if _, exists := result["model"]; !exists {
		t.Error("expected model to remain")
	}
}

func TestDetectModelCapability(t *testing.T) {
	tests := []struct {
		support *ThinkingSupport
		want    ModelCapability
	}{
		{nil, CapabilityNone},
		{&ThinkingSupport{}, CapabilityNone},
		{&ThinkingSupport{Min: 1024, Max: 50000}, CapabilityBudgetOnly},
		{&ThinkingSupport{Levels: []string{"low", "high"}}, CapabilityLevelOnly},
		{&ThinkingSupport{Min: 1024, Max: 50000, Levels: []string{"low", "high"}}, CapabilityHybrid},
	}

	for _, tt := range tests {
		got := DetectModelCapability(tt.support)
		if got != tt.want {
			t.Errorf("DetectModelCapability(%v) = %v, want %v", tt.support, got, tt.want)
		}
	}
}

func TestApplyThinkingOpenAI(t *testing.T) {
	body := map[string]interface{}{
		"model":    "gpt-4o",
		"messages": []interface{}{},
	}

	support := &ThinkingSupport{Levels: []string{"low", "medium", "high"}}

	// With suffix
	result, err := ApplyThinking(body, "gpt-4o(high)", "openai", support)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["reasoning_effort"] != "high" {
		t.Errorf("expected reasoning_effort=high, got %v", result["reasoning_effort"])
	}

	// Without suffix, with body config
	body2 := map[string]interface{}{
		"model":           "gpt-4o",
		"reasoning_effort": "medium",
		"messages":        []interface{}{},
	}
	result2, err := ApplyThinking(body2, "gpt-4o", "openai", support)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result2["reasoning_effort"] != "medium" {
		t.Errorf("expected reasoning_effort=medium, got %v", result2["reasoning_effort"])
	}
}

func TestHasLevel(t *testing.T) {
	levels := []string{"low", "medium", "high"}
	if !HasLevel(levels, "high") {
		t.Error("expected HasLevel(high) = true")
	}
	if HasLevel(levels, "ultra") {
		t.Error("expected HasLevel(ultra) = false")
	}
	if !HasLevel(levels, "HIGH") {
		t.Error("expected HasLevel(HIGH) = true (case insensitive)")
	}
}
