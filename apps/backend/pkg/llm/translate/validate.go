package translate

import (
	"encoding/json"
	"strings"

	"dra-platform/backend/pkg/llm"
)

// ValidateRequest checks a unified ChatRequest before formatting to wire format.
func ValidateRequest(req *llm.ChatRequest) *Error {
	if req == nil {
		return ErrNilInput("internal")
	}
	if strings.TrimSpace(req.Model) == "" {
		return ErrMissingRequired("internal", "model")
	}
	return nil
}

// ValidateResponse checks a unified ChatResponse before formatting to wire format.
func ValidateResponse(resp *llm.ChatResponse) *Error {
	if resp == nil {
		return ErrNilInput("internal")
	}
	return nil
}

// ValidateStreamChunk checks a unified StreamChunk before formatting to wire format.
func ValidateStreamChunk(chunk *llm.StreamChunk) *Error {
	if chunk == nil {
		return ErrNilInput("internal")
	}
	return nil
}

// ValidateMessages checks all messages in a request for basic validity.
func ValidateMessages(msgs []llm.Message) *Error {
	if len(msgs) == 0 {
		return ErrMissingRequired("internal", "messages")
	}
	for i, m := range msgs {
		if strings.TrimSpace(string(m.Role)) == "" {
			return ErrInvalidMessage("internal", "messages["+intStr(i)+"]: empty role")
		}
	}
	return nil
}

// ContentBlockFromMap converts a raw map to a typed ContentBlock, or returns an error.
func ContentBlockFromMap(b map[string]interface{}) (llm.ContentBlock, *Error) {
	if len(b) == 0 {
		return llm.ContentBlock{}, ErrInvalidContentBlock("generic", "empty map")
	}

	cb := llm.ContentBlock{}
	rawType, ok := b["type"].(string)
	if !ok || rawType == "" {
		return llm.ContentBlock{}, ErrInvalidContentBlock("generic", "missing or invalid type field")
	}
	cb.Type = llm.ContentType(rawType)

	switch cb.Type {
	case llm.ContentTypeText:
		cb.Text, _ = b["text"].(string)

	case llm.ContentTypeImage:
		imgRaw, hasImg := b["source"]
		if !hasImg {
			return llm.ContentBlock{}, ErrInvalidContentBlock("generic", "image block missing source")
		}
		img, ok := imgRaw.(map[string]interface{})
		if !ok {
			return llm.ContentBlock{}, ErrInvalidContentBlock("generic", "image source is not an object")
		}
		cb.ImageURL = &llm.ImageURL{}
		if data, ok := img["data"].(string); ok {
			mediaType, _ := img["media_type"].(string)
			cb.ImageURL.URL = "data:" + mediaType + ";base64," + data
		}

	case llm.ContentTypeToolUse:
		cb.ToolUse = &llm.ToolUse{}
		cb.ToolUse.ID, _ = b["id"].(string)
		cb.ToolUse.Name, _ = b["name"].(string)
		if input, ok := b["input"]; ok {
			raw, _ := json.Marshal(input)
			cb.ToolUse.Input = raw
		}

	case llm.ContentTypeToolResult:
		cb.ToolResult = &llm.ToolResult{}
		cb.ToolResult.ToolUseID, _ = b["tool_use_id"].(string)
		if c, ok := b["content"].(string); ok {
			cb.ToolResult.Content = c
		} else if cArr, ok := b["content"].([]interface{}); ok {
			var parts []string
			for _, part := range cArr {
				if p, ok := part.(map[string]interface{}); ok {
					if t, ok := p["text"].(string); ok {
						parts = append(parts, t)
					}
				}
			}
			cb.ToolResult.Content = strings.Join(parts, "")
		}
		if isErr, ok := b["is_error"].(bool); ok {
			cb.ToolResult.IsError = isErr
		}
	}

	return cb, nil
}

// intStr converts int to string without fmt import.
func intStr(i int) string {
	if i == 0 {
		return "0"
	}
	d := []byte{}
	for i > 0 {
		d = append([]byte{byte('0' + i%10)}, d...)
		i /= 10
	}
	return string(d)
}
