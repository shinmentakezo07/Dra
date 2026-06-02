package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/anthropic"
)

func (h *Handler) AnthropicMessages(w http.ResponseWriter, r *http.Request) {
	span := middleware.StartSpan(r.Context(), "anthropic_request")
	span.SetTag("endpoint", "/v1/messages")
	defer span.Finish()

	var req anthropic.MessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAnthropicError(w, http.StatusBadRequest, "invalid_request_error", "Invalid JSON body")
		return
	}

	if req.Model == "" {
		writeAnthropicError(w, http.StatusBadRequest, "invalid_request_error", "model is required")
		return
	}

	if req.MaxTokens <= 0 {
		req.MaxTokens = 4096
	}
	if len(req.Messages) == 0 {
		writeAnthropicError(w, http.StatusBadRequest, "invalid_request_error", "messages is required")
		return
	}

	// Resolve model aliases
	if h.cfg.ModelAliases != nil {
		if resolved, ok := h.cfg.ModelAliases[req.Model]; ok {
			req.Model = resolved
		}
	}

	var userID string
	var apiKeyID *string
	u := middleware.GetUser(r)
	if u != nil {
		userID = u.ID
	} else if key := middleware.GetAPIKey(r); key != nil {
		userID = key.UserID
		if key.ID != "" {
			apiKeyID = &key.ID
		}
	}

	// Only admins can use sandbox mode (consistent with OpenAI proxy)
	isSandbox := false
	if r.Header.Get("X-Sandbox") == "true" {
		isSandbox = u != nil && u.IsAdmin()
	}
	span.SetTag("sandbox", fmt.Sprintf("%v", isSandbox))

	if userID == "" {
		writeAnthropicError(w, http.StatusUnauthorized, "authentication_error", "Authentication required")
		return
	}

	// Content moderation (same as OpenAI proxy)
	if h.moderator != nil && !isSandbox {
		for _, m := range req.Messages {
			// Handle both string and array content formats
			var contentStr string
			if err := json.Unmarshal(m.Content, &contentStr); err == nil && contentStr != "" {
				modResult, modErr := h.moderator.Moderate(r.Context(), contentStr)
				if modErr == nil && modResult != nil && modResult.Flagged {
					logger.Warn("anthropic_content_moderation_flagged", "user_id", userID, "categories", modResult.Categories, "score", modResult.Score)
					writeAnthropicError(w, http.StatusBadRequest, "invalid_request_error", "Content flagged by moderation policy")
					return
				}
			} else {
				// Array content blocks format
				var blocks []struct {
					Type string `json:"type"`
					Text string `json:"text"`
				}
				if err := json.Unmarshal(m.Content, &blocks); err == nil {
					for _, block := range blocks {
						if block.Type == "text" && block.Text != "" {
							modResult, modErr := h.moderator.Moderate(r.Context(), block.Text)
							if modErr == nil && modResult != nil && modResult.Flagged {
								logger.Warn("anthropic_content_moderation_flagged", "user_id", userID, "categories", modResult.Categories, "score", modResult.Score)
								writeAnthropicError(w, http.StatusBadRequest, "invalid_request_error", "Content flagged by moderation policy")
								return
							}
						}
					}
				}
			}
		}
	}

	internalReq := anthropic.ToInternalRequest(&req)

	// API key scoping: max tokens per request
	if apiKey := middleware.GetAPIKey(r); apiKey != nil && apiKey.MaxTokensPerRequest > 0 && !isSandbox {
		// Convert llm.Message to domain.ChatMessage for EstimateTokens
		domainMessages := make([]domain.ChatMessage, len(internalReq.Messages))
		for i, m := range internalReq.Messages {
			domainMessages[i] = domain.ChatMessage{
				Role:    string(m.Role),
				Content: m.Content,
			}
		}
		estInput, estOutput := h.providerSvc.EstimateTokens(internalReq.Model, domainMessages)
		estimatedTokens := estInput + estOutput
		if estimatedTokens > apiKey.MaxTokensPerRequest {
			writeAnthropicError(w, http.StatusTooManyRequests, "invalid_request_error", "estimated tokens exceed max allowed per request for this API key")
			return
		}
	}

	if h.modelRouter != nil {
		span.SetTag("router", "active")
		p, err := h.modelRouter.Route(r.Context(), internalReq)
		if err == nil && p != nil {
			internalReq.Model = p.Name() + "/" + internalReq.Model
			span.SetTag("routed_to", p.Name())
		}
	}

	if h.abRouter != nil {
		span.SetTag("ab_test", "active")
		p, variantName, _ := h.abRouter.Route(r.Context())
		if p != nil {
			internalReq.Model = p.Name() + "/" + internalReq.Model
			span.SetTag("ab_variant", variantName)
		}
	}

	if !isSandbox {
		estInput, estOutput := h.providerSvc.EstimateTokens(internalReq.Model, nil)
		estimatedCost := (estInput + estOutput) * 2
		if estimatedCost < 100 {
			estimatedCost = 100
		}

		var balanceErr *domain.AppError
		canAfford := true
		if balanceErr = h.creditSvc.CheckBalance(r.Context(), userID, estimatedCost); balanceErr != nil {
			canAfford = false
			if h.budgetRouter != nil {
				cheaperModel, routed := h.budgetRouter.FindAffordableModel(r.Context(), internalReq.Model, 0, estInput, estOutput)
				if routed {
					newCost := (estInput + estOutput) * 2
					if newCost < 100 {
						newCost = 100
					}
					if h.creditSvc.CheckBalance(r.Context(), userID, newCost) == nil {
						span.SetTag("budget_routed", "true")
						span.SetTag("budget_original_model", internalReq.Model)
						span.SetTag("budget_cheaper_model", cheaperModel)
						logger.Info("budget_router_downgrade", "user_id", userID, "from", internalReq.Model, "to", cheaperModel)
						internalReq.Model = cheaperModel
						canAfford = true
					}
				}
			}
		}

		if !canAfford {
			writeAnthropicError(w, balanceErr.Status, "insufficient_quota", balanceErr.Message)
			return
		}
	}

	if req.Stream {
		h.handleAnthropicStream(w, r, internalReq, userID, apiKeyID, isSandbox)
		return
	}

	h.handleAnthropicNonStream(w, r, internalReq, userID, apiKeyID, isSandbox)
}

func domainMessagesFromInternal(req *llm.ChatRequest) domain.ChatRequest {
	dReq := domain.ChatRequest{
		Model: req.Model,
	}
	for _, m := range req.Messages {
		dReq.Messages = append(dReq.Messages, domain.ChatMessage{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}
	return dReq
}

func (h *Handler) handleAnthropicNonStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, userID string, apiKeyID *string, isSandbox bool) {
	span := middleware.StartSpan(r.Context(), "anthropic_nonstream")
	defer span.Finish()

	domainReq := domainMessagesFromInternal(req)

	resp, err := h.providerSvc.Chat(r.Context(), domainReq)
	if err != nil {
		writeAnthropicError(w, err.Status, "api_error", err.Message)
		return
	}

	anthropicResp := anthropic.FromInternalResponse(resp)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("x-request-id", resp.ID)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(anthropicResp)

	if !isSandbox {
		h.asyncLogAndDeductAnthropic(r.Context(), userID, apiKeyID, req.Model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens)
	}
}

func (h *Handler) handleAnthropicStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, userID string, apiKeyID *string, isSandbox bool) {
	span := middleware.StartSpan(r.Context(), "anthropic_stream")
	defer span.Finish()

	domainReq := domainMessagesFromInternal(req)

	ch, err := h.providerSvc.ChatStream(r.Context(), domainReq)
	if err != nil {
		writeAnthropicError(w, err.Status, "api_error", err.Message)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	var outputBuf strings.Builder
	var outputTokens int
	sentMessageStart := false
	streamState := &anthropic.StreamingState{}
	modelForStream := req.Model

	done := r.Context().Done()
	for {
		select {
		case chunk, more := <-ch:
			if !more {
				goto ANTHROPIC_FINISH
			}

			// Send message_start on first chunk
			if !sentMessageStart {
				msgID := chunk.ID
				if msgID == "" {
					msgID = anthropic.GenerateID()
				}
				if chunk.Model != "" {
					modelForStream = chunk.Model
				}
				msgStart := anthropic.StreamEvent{
					Type: "message_start",
					Message: &anthropic.MessageResponse{
						ID:    msgID,
						Type:  "message",
						Role:  "assistant",
						Model: modelForStream,
					},
				}
				data, _ := json.Marshal(msgStart)
				fmt.Fprintf(w, "event: message_start\ndata: %s\n\n", data)
				if ok {
					flusher.Flush()
				}
				sentMessageStart = true
			}

			// Track output for token estimation
			if chunk.Delta.Content != "" {
				outputBuf.WriteString(chunk.Delta.Content)
				outputTokens += llm.EstimateTokens(chunk.Delta.Content)
			}

			// Convert chunk to Anthropic SSE events with proper sequencing
			events := anthropic.FromInternalStreamChunk(&chunk, streamState)
			for _, evt := range events {
				data, _ := json.Marshal(evt)
				fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evt.Type, data)
				if ok {
					flusher.Flush()
				}
			}

		case <-done:
			goto ANTHROPIC_FINISH
		}
	}

ANTHROPIC_FINISH:
	// Estimate input tokens from messages if streaming didn't provide usage info
	// outputTokens tracks actual output, inputTokens should be estimated from input
	inputTokens := 0
	for _, m := range req.Messages {
		inputTokens += llm.EstimateTokens(string(m.Role)) + llm.EstimateTokens(m.Content)
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}

	// Send message_stop event
	stopData, _ := json.Marshal(anthropic.StreamEvent{Type: "message_stop"})
	fmt.Fprintf(w, "event: message_stop\ndata: %s\n\n", stopData)
	if ok {
		flusher.Flush()
	}

	if !isSandbox {
		h.asyncLogAndDeductAnthropic(r.Context(), userID, apiKeyID, req.Model, inputTokens, outputTokens)
	}
}

func (h *Handler) asyncLogAndDeductAnthropic(ctx context.Context, userID string, apiKeyID *string, model string, inputTokens, outputTokens int) {
	cost := h.calculateCost(model, inputTokens, outputTokens)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("async_billing_panic", "recover", r, "user_id", userID)
			}
		}()
		bgCtx := context.Background()
		_, logErr := h.creditSvc.LogAndDeduct(bgCtx, userID, apiKeyID, model, inputTokens, outputTokens, cost, 0)
		if logErr != nil {
			logger.Error("anthropic_billing_failed", "error", logErr.Error(), "user_id", userID)
		}
	}()
}

func writeAnthropicError(w http.ResponseWriter, status int, errType, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(anthropic.ErrorResponse{
		Type: errType,
		Error: anthropic.ErrorDetail{
			Type:    errType,
			Message: message,
		},
	})
}
