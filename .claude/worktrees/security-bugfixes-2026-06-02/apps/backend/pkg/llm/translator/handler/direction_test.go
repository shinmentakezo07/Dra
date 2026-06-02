package handler

import (
	"errors"
	"testing"

	"dra-platform/backend/pkg/llm/translator"
)

func TestDetectDirection_KnownPairs(t *testing.T) {
	tests := []struct {
		from     string
		to       string
		expected translator.Direction
	}{
		{"openai", "anthropic", translator.OpenAIToAnthropic},
		{"anthropic", "openai", translator.AnthropicToOpenAI},
	}

	for _, tt := range tests {
		t.Run(tt.from+"_"+tt.to, func(t *testing.T) {
			dir, err := DetectDirection(tt.from, tt.to)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if dir != tt.expected {
				t.Errorf("got %v, want %v", dir, tt.expected)
			}
		})
	}
}

func TestDetectDirection_SameProvider(t *testing.T) {
	_, err := DetectDirection("openai", "openai")
	if err == nil {
		t.Error("expected error for same provider")
	}
	var ue *UnsupportedDirectionError
	if !errors.As(err, &ue) {
		t.Errorf("expected UnsupportedDirectionError, got %T", err)
	}
}

func TestDetectDirection_UnknownPair(t *testing.T) {
	_, err := DetectDirection("google", "mistral")
	if err == nil {
		t.Error("expected error for unknown provider pair")
	}
}

func TestDetectDirection_CaseInsensitive(t *testing.T) {
	dir, err := DetectDirection("OpenAI", "Anthropic")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dir != translator.OpenAIToAnthropic {
		t.Errorf("got %v, want OpenAIToAnthropic", dir)
	}
}

func TestUnsupportedDirectionError_Error(t *testing.T) {
	err := &UnsupportedDirectionError{From: "a", To: "b"}
	want := "unsupported translation direction: a -> b"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}

func TestTranslationError_Error(t *testing.T) {
	err := &TranslationError{Direction: "openai->anthropic", Message: "invalid JSON"}
	want := "translation failed for openai->anthropic: invalid JSON"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}
