package handler

import (
	"fmt"
	"strings"

	"dra-platform/backend/pkg/llm/translator"
)

// DetectDirection determines the translation direction from source and target providers.
func DetectDirection(fromProvider, toProvider string) (translator.Direction, error) {
	from := strings.ToLower(fromProvider)
	to := strings.ToLower(toProvider)

	if from == to {
		return 0, &UnsupportedDirectionError{From: fromProvider, To: toProvider}
	}

	switch {
	case from == "openai" && to == "anthropic":
		return translator.OpenAIToAnthropic, nil
	case from == "anthropic" && to == "openai":
		return translator.AnthropicToOpenAI, nil
	}

	return 0, &UnsupportedDirectionError{From: fromProvider, To: toProvider}
}

// FormatDirection returns a human-readable string for a direction.
func FormatDirection(dir translator.Direction) string {
	switch dir {
	case translator.AnthropicToOpenAI:
		return "anthropic -> openai"
	case translator.OpenAIToAnthropic:
		return "openai -> anthropic"
	default:
		return fmt.Sprintf("unknown(%d)", dir)
	}
}
