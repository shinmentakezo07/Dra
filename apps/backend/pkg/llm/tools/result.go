package tools

import (
	"encoding/json"
	"fmt"

	"dra-platform/backend/pkg/llm"
)

// FormatToolResult converts a ToolResult into an llm.Message.
func FormatToolResult(result ToolResult) llm.Message {
	content := ""
	if result.Error != nil {
		content = fmt.Sprintf("Error: %v", result.Error)
	} else {
		content = formatResultValue(result.Result)
	}

	return llm.Message{
		Role:       llm.RoleTool,
		Content:    content,
		ToolCallID: result.ID,
	}
}

// FormatToolResults converts multiple ToolResults into llm.Messages.
func FormatToolResults(results []ToolResult) []llm.Message {
	if len(results) == 0 {
		return nil
	}

	msgs := make([]llm.Message, len(results))
	for i, r := range results {
		msgs[i] = FormatToolResult(r)
	}
	return msgs
}

// FormatToolCallsMessage creates an assistant message with tool calls.
func FormatToolCallsMessage(calls []llm.ToolCall) llm.Message {
	return llm.Message{
		Role:      llm.RoleAssistant,
		ToolCalls: calls,
	}
}

func formatResultValue(v interface{}) string {
	if v == nil {
		return ""
	}

	switch val := v.(type) {
	case string:
		return val
	case []byte:
		return string(val)
	case json.RawMessage:
		return string(val)
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", val)
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", val)
	case float32, float64:
		return fmt.Sprintf("%v", val)
	case bool:
		return fmt.Sprintf("%t", val)
	default:
		b, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		return string(b)
	}
}
