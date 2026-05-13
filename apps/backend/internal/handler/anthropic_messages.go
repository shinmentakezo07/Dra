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

	isSandbox := r.Header.Get("X-Sandbox") == "true"
	span.SetTag("sandbox", fmt.Sprintf("%v", isSandbox))

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

	if userID == "" {
		writeAnthropicError(w, http.StatusUnauthorized, "authentication_error", "Authentication required")
		return
	}

	internalReq := anthropic.ToInternalRequest(&req)

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

func (h *Handler) handleAnthropicNonStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, userID string, apiKeyID *string, isSandbox bool) {
	span := middleware.StartSpan(r.Context(), "anthropic_nonstream")
	defer span.Finish()

	domainReq := domain.ChatRequest{
		Model: req.Model,
	}
	for _, m := range req.Messages {
		domainReq.Messages = append(domainReq.Messages, domain.ChatMessage{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

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

	domainReq := domain.ChatRequest{
		Model: req.Model,
	}
	for _, m := range req.Messages {
		domainReq.Messages = append(domainReq.Messages, domain.ChatMessage{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

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

	done := r.Context().Done()
	for {
		select {
		case chunk, more := <-ch:
			if !more {
				goto ANTHROPIC_FINISH
			}

			// Send message_start on first chunk
			if !sentMessageStart {
				msgStart := anthropic.StreamEvent{
					Type: "message_start",
					Message: &anthropic.MessageResponse{
						ID:    chunk.ID,
						Type:  "message",
						Role:  "assistant",
						Model: chunk.Model,
						Content: []anthropic.ResponseBlock{
							{Type: "text", Text: ""},
						},
					},
				}
				data, _ := json.Marshal(msgStart)
				fmt.Fprintf(w, "event: message_start\ndata: %s\n\n", data)
				if ok {
					flusher.Flush()
				}
				sentMessageStart = true
			}

			if chunk.Delta.Content != "" {
				outputBuf.WriteString(chunk.Delta.Content)
				outputTokens += llm.EstimateTokens(chunk.Delta.Content)
				events := anthropic.FromInternalStreamChunk(&chunk)
				for _, evt := range events {
					data, _ := json.Marshal(evt)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evt.Type, data)
					if ok {
						flusher.Flush()
					}
				}
			}

		case <-done:
			goto ANTHROPIC_FINISH
		}
	}

ANTHROPIC_FINISH:
	inputTokens := llm.EstimateTokens(outputBuf.String())
	if inputTokens == 0 {
		inputTokens = len(req.Messages) * 50
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}

	// Send message_stop
	stopEvent := anthropic.StreamEvent{
		Type: "message_stop",
	}
	stopData, _ := json.Marshal(stopEvent)
	fmt.Fprintf(w, "event: message_stop\ndata: %s\n\n", stopData)
	if ok {
		flusher.Flush()
	}

	if !isSandbox {
		h.asyncLogAndDeductAnthropic(r.Context(), userID, apiKeyID, req.Model, inputTokens, outputTokens)
	}
}

func (h *Handler) asyncLogAndDeductAnthropic(ctx context.Context, userID string, apiKeyID *string, model string, inputTokens, outputTokens int) {
	cost := (inputTokens + outputTokens) * 2
	if cost < 100 {
		cost = 100
	}
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
