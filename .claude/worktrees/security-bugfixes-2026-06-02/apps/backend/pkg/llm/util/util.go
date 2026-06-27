// Package util provides shared utility functions for the LLM gateway.
// Includes JSON helpers, tool name sanitization, function name fixing,
// and other common operations used across translators and providers.
package util

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
)

// functionNameSanitizer matches characters not allowed in Gemini/Vertex AI function names.
var functionNameSanitizer = regexp.MustCompile(`[^a-zA-Z0-9_.:-]`)

// SanitizeFunctionName ensures a function name matches Gemini/Vertex AI requirements.
// Replaces invalid characters with underscores, ensures it starts with a letter or underscore,
// and truncates to 64 characters.
func SanitizeFunctionName(name string) string {
	if name == "" {
		return ""
	}

	sanitized := functionNameSanitizer.ReplaceAllString(name, "_")

	if len(sanitized) > 0 {
		first := sanitized[0]
		if !((first >= 'a' && first <= 'z') || (first >= 'A' && first <= 'Z') || first == '_') {
			if len(sanitized) >= 64 {
				sanitized = sanitized[:63]
			}
			sanitized = "_" + sanitized
		}
	} else {
		sanitized = "_"
	}

	if len(sanitized) > 64 {
		sanitized = sanitized[:64]
	}
	return sanitized
}

// CanonicalToolName returns a normalized tool name for case-insensitive matching.
func CanonicalToolName(name string) string {
	canonical := strings.TrimSpace(name)
	canonical = strings.TrimLeft(canonical, "_")
	return strings.ToLower(canonical)
}

// ToolNameMap builds a canonical-name -> original-name map from a list of tool names.
// Used to restore exact tool name casing after translation.
func ToolNameMap(names []string) map[string]string {
	out := make(map[string]string, len(names))
	for _, name := range names {
		if name == "" {
			continue
		}
		key := CanonicalToolName(name)
		if key == "" {
			continue
		}
		if _, exists := out[key]; !exists {
			out[key] = name
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// SanitizedToolNameMap builds a sanitized-name -> original-name map.
// Only includes entries where sanitization actually changed the name.
func SanitizedToolNameMap(names []string) map[string]string {
	out := make(map[string]string)
	for _, name := range names {
		if name == "" {
			continue
		}
		sanitized := SanitizeFunctionName(name)
		if sanitized == name {
			continue
		}
		if _, exists := out[sanitized]; !exists {
			out[sanitized] = name
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// RestoreSanitizedToolName looks up a sanitized name in the map and returns the original.
func RestoreSanitizedToolName(toolNameMap map[string]string, sanitizedName string) string {
	if sanitizedName == "" || toolNameMap == nil {
		return sanitizedName
	}
	if original, ok := toolNameMap[sanitizedName]; ok {
		return original
	}
	return sanitizedName
}

// MapToolName maps a tool name using a canonical-name -> original-name map.
func MapToolName(toolNameMap map[string]string, name string) string {
	if name == "" || toolNameMap == nil {
		return name
	}
	if mapped, ok := toolNameMap[CanonicalToolName(name)]; ok && mapped != "" {
		return mapped
	}
	return name
}

// FixJSON converts non-standard JSON with single-quoted strings to RFC 8259 compliant JSON.
//
// Examples:
//
//	{'a': 1, 'b': '2'} => {"a": 1, "b": "2"}
//	{"t": 'He said "hi"'} => {"t": "He said \"hi\""}
func FixJSON(input string) string {
	var out bytes.Buffer

	inDouble := false
	inSingle := false
	escaped := false

	writeConverted := func(r rune) {
		if r == '"' {
			out.WriteByte('\\')
			out.WriteByte('"')
			return
		}
		out.WriteRune(r)
	}

	runes := []rune(input)
	for i := 0; i < len(runes); i++ {
		r := runes[i]

		if inDouble {
			out.WriteRune(r)
			if escaped {
				escaped = false
				continue
			}
			if r == '\\' {
				escaped = true
				continue
			}
			if r == '"' {
				inDouble = false
			}
			continue
		}

		if inSingle {
			if escaped {
				escaped = false
				switch r {
				case 'n', 'r', 't', 'b', 'f', '/', '"':
					out.WriteByte('\\')
					out.WriteRune(r)
				case '\\':
					out.WriteByte('\\')
					out.WriteByte('\\')
				case '\'':
					out.WriteRune('\'')
				case 'u':
					out.WriteByte('\\')
					out.WriteByte('u')
					for k := 0; k < 4 && i+1 < len(runes); k++ {
						peek := runes[i+1]
						if (peek >= '0' && peek <= '9') || (peek >= 'a' && peek <= 'f') || (peek >= 'A' && peek <= 'F') {
							out.WriteRune(peek)
							i++
						} else {
							break
						}
					}
				default:
					out.WriteByte('\\')
					out.WriteRune(r)
				}
				continue
			}

			if r == '\\' {
				escaped = true
				continue
			}
			if r == '\'' {
				out.WriteByte('"')
				inSingle = false
				continue
			}
			writeConverted(r)
			continue
		}

		if r == '"' {
			inDouble = true
			out.WriteRune(r)
			continue
		}
		if r == '\'' {
			inSingle = true
			out.WriteByte('"')
			continue
		}
		out.WriteRune(r)
	}

	if inSingle {
		out.WriteByte('"')
	}

	return out.String()
}

// IsClaudeThinkingModel checks if the model name indicates a Claude thinking model.
func IsClaudeThinkingModel(model string) bool {
	lower := strings.ToLower(model)
	return strings.Contains(lower, "claude") && strings.Contains(lower, "thinking")
}

// IsGeminiModel checks if the model name indicates a Gemini model.
func IsGeminiModel(model string) bool {
	return strings.Contains(strings.ToLower(model), "gemini")
}

// IsClaudeModel checks if the model name indicates a Claude model.
func IsClaudeModel(model string) bool {
	return strings.Contains(strings.ToLower(model), "claude")
}

// ModelFamily returns the provider family for a model name.
func ModelFamily(model string) string {
	lower := strings.ToLower(model)
	switch {
	case strings.Contains(lower, "claude"):
		return "anthropic"
	case strings.Contains(lower, "gpt"), strings.Contains(lower, "o1"), strings.Contains(lower, "o3"):
		return "openai"
	case strings.Contains(lower, "gemini"):
		return "gemini"
	case strings.Contains(lower, "groq"):
		return "groq"
	default:
		return "unknown"
	}
}

// EscapeGJSONPathKey escapes special characters for gjson/sjson path syntax.
func EscapeGJSONPathKey(key string) string {
	key = strings.ReplaceAll(key, `\`, `\\`)
	key = strings.ReplaceAll(key, ".", `\.`)
	key = strings.ReplaceAll(key, "*", `\*`)
	key = strings.ReplaceAll(key, "?", `\?`)
	return key
}

// WalkJSON recursively traverses a JSON-like structure to find all occurrences of a field.
// Returns dot-notation paths to each occurrence.
func WalkJSON(data interface{}, path, field string, paths *[]string) {
	switch v := data.(type) {
	case map[string]interface{}:
		for key, val := range v {
			childPath := key
			if path != "" {
				childPath = path + "." + EscapeGJSONPathKey(key)
			}
			if key == field {
				*paths = append(*paths, childPath)
			}
			WalkJSON(val, childPath, field, paths)
		}
	case []interface{}:
		for i, val := range v {
			childPath := fmt.Sprintf("%d", i)
			if path != "" {
				childPath = path + "." + childPath
			}
			WalkJSON(val, childPath, field, paths)
		}
	}
}
