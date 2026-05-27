package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"dra-platform/backend/internal/pkg/logger"
)

// TransformConfig holds request/response transformation rules.
type TransformConfig struct {
	SystemPromptInjections map[string]string // model prefix -> system prompt
	StripHeaders           []string          // headers to strip from outgoing requests
	ResponseReplacements   map[string]string // text to find -> replacement
}

// TransformMiddleware applies request/response transformations.
func TransformMiddleware(cfg TransformConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only apply to chat completion endpoints
			if !strings.HasSuffix(r.URL.Path, "/chat/completions") {
				next.ServeHTTP(w, r)
				return
			}

			// Read body with a reasonable size limit (10MB)
			const maxBodySize = 10 << 20
			body, err := io.ReadAll(io.LimitReader(r.Body, maxBodySize))
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			if len(body) >= maxBodySize {
				logger.Warn("transform_middleware_body_too_large", "path", r.URL.Path)
			}
			r.Body.Close()

			// Modify request body if applicable
			modified := applyRequestTransforms(body, cfg)

			// Restore body
			r.Body = io.NopCloser(bytes.NewReader(modified))
			r.ContentLength = int64(len(modified))

			// Strip headers
			for _, h := range cfg.StripHeaders {
				r.Header.Del(h)
			}

			next.ServeHTTP(w, r)
		})
	}
}

func applyRequestTransforms(body []byte, cfg TransformConfig) []byte {
	var req map[string]interface{}
	if err := json.Unmarshal(body, &req); err != nil {
		return body
	}

	model, _ := req["model"].(string)
	if model == "" {
		return body
	}

	// System prompt injection based on model prefix
	for prefix, prompt := range cfg.SystemPromptInjections {
		if strings.HasPrefix(model, prefix) {
			messages, ok := req["messages"].([]interface{})
			if !ok {
				messages = []interface{}{}
			}

			// Check if first message is system
			hasSystem := false
			if len(messages) > 0 {
				if first, ok := messages[0].(map[string]interface{}); ok {
					if role, _ := first["role"].(string); role == "system" {
						hasSystem = true
						newFirst := make(map[string]interface{}, len(first))
						for k, v := range first {
							newFirst[k] = v
						}
						newFirst["content"] = prompt
						messages[0] = newFirst
					}
				}
			}

			if !hasSystem {
				newMessages := make([]interface{}, 0, len(messages)+1)
				newMessages = append(newMessages, map[string]interface{}{
					"role":    "system",
					"content": prompt,
				})
				newMessages = append(newMessages, messages...)
				req["messages"] = newMessages
			}

			logger.Info("system_prompt_injected", "model", model, "prefix", prefix)
			break
		}
	}

	modified, err := json.Marshal(req)
	if err != nil {
		return body
	}
	return modified
}
