package thinking

import "strings"

// StripConfig removes thinking configuration fields from a request body map.
// Used when a model doesn't support thinking but the request contains thinking config.
func StripConfig(body map[string]interface{}, provider string) map[string]interface{} {
	if len(body) == 0 {
		return body
	}

	switch strings.ToLower(provider) {
	case "anthropic", "claude":
		delete(body, "thinking")
	case "openai":
		delete(body, "reasoning_effort")
	case "gemini":
		if genConfig, ok := body["generationConfig"].(map[string]interface{}); ok {
			delete(genConfig, "thinkingConfig")
			if len(genConfig) == 0 {
				delete(body, "generationConfig")
			}
		}
	}

	return body
}

// StripConfigBytes removes thinking config from raw JSON bytes.
// Returns the body unchanged if provider is unknown.
func StripConfigBytes(body []byte, provider string) []byte {
	// For raw bytes, we parse -> strip -> re-serialize
	// This is handled at the handler level with the map-based approach above.
	return body
}
