package util

import (
	"testing"
)

func TestSanitizeFunctionName(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"", ""},
		{"valid_name", "valid_name"},
		{"fs.readFile", "fs.readFile"},
		{"name with spaces", "name_with_spaces"},
		{"123starts", "_123starts"},
		{"a", "a"},
		{"_valid", "_valid"},
	}

	for _, tt := range tests {
		got := SanitizeFunctionName(tt.input)
		if got != tt.want {
			t.Errorf("SanitizeFunctionName(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}

	// Check truncation
	longName := make([]byte, 100)
	for i := range longName {
		longName[i] = 'a'
	}
	result := SanitizeFunctionName(string(longName))
	if len(result) > 64 {
		t.Errorf("expected max 64 chars, got %d", len(result))
	}
}

func TestCanonicalToolName(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"ReadFile", "readfile"},
		{"_MyTool", "mytool"},
		{"  Tool  ", "tool"},
		{"UPPER", "upper"},
	}

	for _, tt := range tests {
		got := CanonicalToolName(tt.input)
		if got != tt.want {
			t.Errorf("CanonicalToolName(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestToolNameMap(t *testing.T) {
	names := []string{"ReadFile", "writeFile", "READFILE"}
	m := ToolNameMap(names)
	if m == nil {
		t.Fatal("expected non-nil map")
	}
	// First occurrence wins
	if m["readfile"] != "ReadFile" {
		t.Errorf("expected ReadFile, got %s", m["readfile"])
	}
	if m["writefile"] != "writeFile" {
		t.Errorf("expected writeFile, got %s", m["writefile"])
	}
}

func TestSanitizedToolNameMap(t *testing.T) {
	// "name with spaces" has spaces which get replaced with underscores
	names := []string{"name with spaces", "normal_name"}
	m := SanitizedToolNameMap(names)
	if m == nil {
		t.Fatal("expected non-nil map")
	}
	if _, exists := m["name_with_spaces"]; !exists {
		t.Errorf("expected name_with_spaces mapping, got %v", m)
	}
	// normal_name should not be in map (no change)
	if _, exists := m["normal_name"]; exists {
		t.Error("expected normal_name to not be in sanitized map")
	}
}

func TestRestoreSanitizedToolName(t *testing.T) {
	m := map[string]string{"fs_readFile": "fs.readFile"}
	if got := RestoreSanitizedToolName(m, "fs_readFile"); got != "fs.readFile" {
		t.Errorf("expected fs.readFile, got %s", got)
	}
	if got := RestoreSanitizedToolName(m, "unknown"); got != "unknown" {
		t.Errorf("expected unknown passthrough, got %s", got)
	}
	if got := RestoreSanitizedToolName(nil, "test"); got != "test" {
		t.Errorf("expected test passthrough, got %s", got)
	}
}

func TestFixJSON(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{`{'a': 1}`, `{"a": 1}`},
		{`{"a": 1}`, `{"a": 1}`},
		{`{'key': 'value'}`, `{"key": "value"}`},
	}

	for _, tt := range tests {
		got := FixJSON(tt.input)
		if got != tt.want {
			t.Errorf("FixJSON(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestModelFamily(t *testing.T) {
	tests := []struct {
		model string
		want  string
	}{
		{"claude-sonnet-4-5", "anthropic"},
		{"gpt-4o", "openai"},
		{"o1-preview", "openai"},
		{"o3-mini", "openai"},
		{"gemini-2.5-pro", "gemini"},
		{"llama-3", "unknown"},
	}

	for _, tt := range tests {
		got := ModelFamily(tt.model)
		if got != tt.want {
			t.Errorf("ModelFamily(%q) = %q, want %q", tt.model, got, tt.want)
		}
	}
}

func TestIsClaudeThinkingModel(t *testing.T) {
	if !IsClaudeThinkingModel("claude-thinking-sonnet") {
		t.Error("expected true for claude-thinking model")
	}
	if IsClaudeThinkingModel("claude-sonnet-4-5") {
		t.Error("expected false for non-thinking claude model")
	}
}

func TestWalkJSON(t *testing.T) {
	data := map[string]interface{}{
		"a": map[string]interface{}{
			"name": "first",
			"b": map[string]interface{}{
				"name": "second",
			},
		},
		"name": "root",
	}

	var paths []string
	WalkJSON(data, "", "name", &paths)
	if len(paths) != 3 {
		t.Errorf("expected 3 paths, got %d: %v", len(paths), paths)
	}
}
