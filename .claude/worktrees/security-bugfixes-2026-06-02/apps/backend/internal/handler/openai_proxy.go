package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/embeddings"
	"dra-platform/backend/pkg/llm/openai"
)

func (h *Handler) OpenAIChatCompletions(w http.ResponseWriter, r *http.Request) {
	span := middleware.StartSpan(r.Context(), "openai_request")
	span.SetTag("endpoint", "/v1/chat/completions")
	defer span.Finish()

	var req openai.ChatCompletionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOpenAIError(w, http.StatusBadRequest, "invalid_request_error", "Invalid JSON body")
		return
	}

	if req.Model == "" {
		writeOpenAIError(w, http.StatusBadRequest, "invalid_request_error", "model is required")
		return
	}

	// Resolve model aliases
	if h.cfg.ModelAliases != nil {
		if resolved, ok := h.cfg.ModelAliases[req.Model]; ok {
			req.Model = resolved
		}
	}

	isSandbox := false
	if r.Header.Get("X-Sandbox") == "true" {
		u := middleware.GetUser(r)
		isSandbox = u != nil && u.IsAdmin()
	}
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
		writeOpenAIError(w, http.StatusUnauthorized, "authentication_error", "Authentication required")
		return
	}

	internalReq := openai.ToInternalRequest(&req)

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
		estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, nil)
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
			writeOpenAIError(w, balanceErr.Status, "insufficient_quota", balanceErr.Message)
			return
		}
	}

	if req.Stream {
		h.handleOpenAIStream(w, r, internalReq, userID, apiKeyID, isSandbox)
		return
	}

	h.handleOpenAINonStream(w, r, internalReq, userID, apiKeyID, isSandbox)
}

func (h *Handler) handleOpenAINonStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, userID string, apiKeyID *string, isSandbox bool) {
	span := middleware.StartSpan(r.Context(), "openai_nonstream")
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
		writeOpenAIError(w, err.Status, "api_error", err.Message)
		return
	}

	openaiResp := openai.FromInternalResponse(resp)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(openaiResp)

	if !isSandbox {
		h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens)
	}
}

func (h *Handler) handleOpenAIStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, userID string, apiKeyID *string, isSandbox bool) {
	span := middleware.StartSpan(r.Context(), "openai_stream")
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
		writeOpenAIError(w, err.Status, "api_error", err.Message)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	var outputBuf strings.Builder
	var outputTokens int

	done := r.Context().Done()
	for {
		select {
		case chunk, more := <-ch:
			if !more {
				goto FINISH
			}
			if chunk.Delta.Content != "" {
				outputBuf.WriteString(chunk.Delta.Content)
				outputTokens += llm.EstimateTokens(chunk.Delta.Content)
				c := chunk
				openaiChunk := openai.FromInternalStreamChunk(&c)
				data, _ := json.Marshal(openaiChunk)
				fmt.Fprintf(w, "data: %s\n\n", data)
				if ok {
					flusher.Flush()
				}
			}
			if chunk.FinishReason != nil {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				if ok {
					flusher.Flush()
				}
				goto FINISH
			}
		case <-done:
			goto FINISH
		}
	}

FINISH:
	// Estimate input tokens from the request messages, not the output buffer
	inputTokens := 0
	for _, m := range req.Messages {
		inputTokens += llm.EstimateTokens(string(m.Role)) + llm.EstimateTokens(m.Content)
	}
	if inputTokens == 0 {
		inputTokens = len(req.Messages) * 50
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}

	if !isSandbox {
		h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, inputTokens, outputTokens)
	}
}

func (h *Handler) asyncLogAndDeduct(ctx context.Context, userID string, apiKeyID *string, model string, inputTokens, outputTokens int) {
	cost := h.calculateCost(model, inputTokens, outputTokens)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("async_billing_panic", "recover", r, "user_id", userID)
			}
		}()
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, logErr := h.creditSvc.LogAndDeduct(bgCtx, userID, apiKeyID, model, inputTokens, outputTokens, cost, 0)
		if logErr != nil {
			logger.Error("openai_billing_failed", "error", logErr.Error(), "user_id", userID)
		}
	}()
}

func (h *Handler) OpenAIEmbeddings(w http.ResponseWriter, r *http.Request) {
	span := middleware.StartSpan(r.Context(), "openai_embeddings")
	defer span.Finish()

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
		writeOpenAIError(w, http.StatusUnauthorized, "authentication_error", "Authentication required")
		return
	}

	var req openai.EmbeddingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOpenAIError(w, http.StatusBadRequest, "invalid_request_error", "Invalid JSON body")
		return
	}

	if req.Model == "" {
		writeOpenAIError(w, http.StatusBadRequest, "invalid_request_error", "model is required")
		return
	}

	// Extract inputs
	var inputs []string
	switch v := req.Input.(type) {
	case string:
		inputs = []string{v}
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				inputs = append(inputs, s)
			}
		}
	case []string:
		inputs = v
	}

	if len(inputs) == 0 {
		writeOpenAIError(w, http.StatusBadRequest, "invalid_request_error", "input is required")
		return
	}

	var resp *embeddings.EmbeddingResponse
	if h.embeddingRegistry != nil {
		var embedErr error
		resp, embedErr = h.embeddingRegistry.RouteRequest(r.Context(), &embeddings.EmbeddingRequest{
			Model: req.Model,
			Input: inputs,
		})
		if embedErr != nil {
			logger.Error("embedding_route_failed", "error", embedErr.Error(), "user_id", userID, "model", req.Model)
			writeOpenAIError(w, http.StatusBadGateway, "api_error", "Embedding provider error")
			return
		}
	} else {
		embedProvider := embeddings.NewOpenAIProvider(h.cfg.OpenAIAPIKey)
		var embedErr error
		resp, embedErr = embedProvider.Embed(r.Context(), &embeddings.EmbeddingRequest{
			Model: req.Model,
			Input: inputs,
		})
		if embedErr != nil {
			logger.Error("embedding_failed", "error", embedErr.Error(), "user_id", userID, "model", req.Model)
			writeOpenAIError(w, http.StatusBadGateway, "api_error", "Embedding provider error")
			return
		}
	}

	// Convert to OpenAI response format
	data := make([]openai.Embedding, len(resp.Data))
	for i, d := range resp.Data {
		data[i] = openai.Embedding{
			Object:    d.Object,
			Index:     d.Index,
			Embedding: d.Embedding,
		}
	}

	openaiResp := openai.EmbeddingResponse{
		Object: "list",
		Data:   data,
		Model:  req.Model,
		Usage: openai.Usage{
			PromptTokens: resp.TotalTokens,
			TotalTokens:  resp.TotalTokens,
		},
	}

	// Async billing (skip in sandbox mode)
	if r.Header.Get("X-Sandbox") != "true" {
		h.asyncLogAndDeduct(r.Context(), userID, apiKeyID, req.Model, resp.TotalTokens, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(openaiResp)
}

func (h *Handler) OpenAIListModels(w http.ResponseWriter, r *http.Request) {
	span := middleware.StartSpan(r.Context(), "openai_models")
	defer span.Finish()

	models, err := h.providerSvc.ListModels(r.Context())
	if err != nil {
		writeOpenAIError(w, err.Status, "api_error", err.Message)
		return
	}

	openaiModels := openai.FromInternalModels(models)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(openaiModels)
}

func writeOpenAIError(w http.ResponseWriter, status int, errType, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(openai.ErrorResponse{
		Error: openai.ErrorDetail{
			Message: message,
			Type:    errType,
		},
	})
}

// calculateCost uses the pricing service for per-model pricing, falling back to flat formula.
func (h *Handler) calculateCost(model string, inputTokens, outputTokens int) int {
	if h.pricingSvc != nil {
		return h.pricingSvc.CalculateCost(model, inputTokens, outputTokens)
	}
	cost := (inputTokens + outputTokens) * 2
	if cost < 100 {
		cost = 100
	}
	return cost
}
