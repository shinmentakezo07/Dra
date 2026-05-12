package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/circuitbreaker"
	"dra-platform/backend/pkg/llm/guardrails"
	"dra-platform/backend/pkg/llm/moderation"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	"dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/webhook"
	"dra-platform/backend/pkg/email"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	cfg             *config.Config
	db              *db.DB
	userSvc         *service.UserService
	keySvc          *service.APIKeyService
	creditSvc       *service.CreditService
	analyticsSvc    *service.AnalyticsService
	logSvc          *service.LogService
	providerSvc     *service.ProviderService
	webhookSvc      *service.WebhookService
	batchSvc        *service.BatchService
	orgSvc          *service.OrganizationService
	fileRepo        *repository.FileRepo
	moderator       moderation.Moderator
	guard           *guardrails.Guard
	notificationHub *NotificationHub
	llmRegistry     *llmprovider.Registry
	modelRouter     *router.Router
	budgetRouter    *router.BudgetRouter
	dedupCache      *cache.DedupCache
	semanticCache   *cache.SemanticCache
	abRouter        *router.ABRouter
	emailSender     email.Sender
	stripeSvc       *service.StripeService
}

// SetGuard sets the guardrails guard.
func (h *Handler) SetGuard(g *guardrails.Guard) {
	h.guard = g
}

func New(cfg *config.Config, database *db.DB, u *service.UserService, k *service.APIKeyService, c *service.CreditService, a *service.AnalyticsService, l *service.LogService, p *service.ProviderService, w *service.WebhookService, b *service.BatchService, o *service.OrganizationService) *Handler {
	return &Handler{cfg: cfg, db: database, userSvc: u, keySvc: k, creditSvc: c, analyticsSvc: a, logSvc: l, providerSvc: p, webhookSvc: w, batchSvc: b, orgSvc: o, fileRepo: repository.NewFileRepo(database), moderator: moderation.NewLocalModerator(), notificationHub: NewNotificationHub()}
}

// SetLLMRegistry sets the pkg/llm provider registry for OpenAI-compatible proxy endpoints.
func (h *Handler) SetLLMRegistry(r *llmprovider.Registry) {
	h.llmRegistry = r
}

// SetModelRouter sets the intelligent model router.
func (h *Handler) SetModelRouter(r *router.Router) {
	h.modelRouter = r
}

// SetBudgetRouter sets the budget-aware model router.
func (h *Handler) SetBudgetRouter(r *router.BudgetRouter) {
	h.budgetRouter = r
}

// SetBatchService sets the batch service (used for late wiring in main).
func (h *Handler) SetBatchService(b *service.BatchService) {
	h.batchSvc = b
}

// SetDedupCache sets the deduplication cache.
func (h *Handler) SetDedupCache(d *cache.DedupCache) {
	h.dedupCache = d
}

// SetSemanticCache sets the semantic cache.
func (h *Handler) SetSemanticCache(s *cache.SemanticCache) {
	h.semanticCache = s
}

// SetABRouter sets the A/B test router.
func (h *Handler) SetABRouter(ab *router.ABRouter) {
	h.abRouter = ab
}

// SetEmailSender sets the email sender.
func (h *Handler) SetEmailSender(s email.Sender) {
	h.emailSender = s
}

// SetStripeService sets the Stripe service.
func (h *Handler) SetStripeService(s *service.StripeService) {
	h.stripeSvc = s
}

// ChatFnForBatch returns a chat function suitable for batch processing.
func (h *Handler) ChatFnForBatch() func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
		domainReq := domain.ChatRequest{
			Model: req.Model,
			Messages: make([]domain.ChatMessage, len(req.Messages)),
		}
		for i, m := range req.Messages {
			domainReq.Messages[i] = domain.ChatMessage{Role: string(m.Role), Content: m.Content}
		}
		return h.providerSvc.Chat(ctx, domainReq)
	}
}

func parsePagination(r *http.Request) (page, limit int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 { page = 1 }
	limit, _ = strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 { limit = 20 }
	return page, limit
}

// Health
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	if err := h.db.Health(r.Context()); err != nil {
		logger.Error("health_check_failed", "error", err.Error())
		response.JSON(w, http.StatusServiceUnavailable, response.Body{Success: false, Error: "Database unavailable"})
		return
	}
	response.OK(w, map[string]string{"status": "ok", "version": "1.0.0"})
}

// Auth
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req domain.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	auth, appErr := h.userSvc.Register(r.Context(), req)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.Created(w, auth)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	auth, appErr := h.userSvc.Authenticate(r.Context(), req)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.OK(w, auth)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	user, err := h.userSvc.GetByID(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, user)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Name == "" || len(req.Name) < 2 {
		response.Error(w, 400, "Name must be at least 2 characters")
		return
	}
	if req.Email == "" {
		response.Error(w, 400, "Email is required")
		return
	}
	if err := h.userSvc.UpdateProfile(r.Context(), u.ID, req.Name, req.Email); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		response.Error(w, 400, "Current and new passwords are required")
		return
	}
	if len(req.NewPassword) < 6 {
		response.Error(w, 400, "New password must be at least 6 characters")
		return
	}
	if err := h.userSvc.ChangePassword(r.Context(), u.ID, req.CurrentPassword, req.NewPassword); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

// OAuthLogin handles OAuth user creation/login.
func (h *Handler) OAuthLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Provider string `json:"provider"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Email == "" || req.Name == "" {
		response.Error(w, 400, "Email and name are required")
		return
	}
	auth, appErr := h.userSvc.OAuthLogin(r.Context(), req.Email, req.Name, req.Provider)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.OK(w, auth)
}

// ForgotPassword initiates a password reset.
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Email == "" {
		response.Error(w, 400, "Email is required")
		return
	}
	token, err := h.userSvc.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	if token != "" && h.emailSender != nil {
		// Build reset URL from frontend origin or default
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}
		resetURL := fmt.Sprintf("%s/reset-password?token=%s", origin, token)
		if eErr := email.SendPasswordReset(h.emailSender, req.Email, resetURL); eErr != nil {
			logger.Error("password_reset_email_failed", "error", eErr.Error())
		}
	}
	response.OK(w, map[string]bool{"sent": true})
}

// ResetPassword completes a password reset.
func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		response.Error(w, 400, "Token and new password are required")
		return
	}
	if len(req.NewPassword) < 6 {
		response.Error(w, 400, "Password must be at least 6 characters")
		return
	}
	if err := h.userSvc.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

// API Keys
func (h *Handler) ListKeys(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	keys, err := h.keySvc.List(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, keys)
}

func (h *Handler) CreateKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.CreateKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	key, err := h.keySvc.Create(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, key)
}

func (h *Handler) DeleteKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" { id = r.URL.Query().Get("id") }
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.keySvc.Delete(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) RevokeKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" { id = r.URL.Query().Get("id") }
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.keySvc.Revoke(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"revoked": true})
}

// Credits
func (h *Handler) GetCredits(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	credits, err := h.creditSvc.GetBalance(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, credits)
}

func (h *Handler) PurchaseCredits(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.PurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}

	// If Stripe is configured, create a checkout session
	if h.stripeSvc != nil && h.stripeSvc.IsConfigured() {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}
		successURL := origin + "/dashboard/billing?success=true"
		cancelURL := origin + "/dashboard/billing?canceled=true"
		checkoutURL, err := h.stripeSvc.CreateCheckoutSession(r.Context(), u.ID, req.Amount, successURL, cancelURL)
		if err != nil {
			response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
			return
		}
		response.OK(w, map[string]string{"checkoutUrl": checkoutURL})
		return
	}

	// Fallback: direct credit purchase (development/testing)
	tx, err := h.creditSvc.Purchase(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, tx)

	// Emit webhook event
	if h.webhookSvc != nil {
		h.webhookSvc.Dispatch(r.Context(), u.ID, webhook.Event{
			Type:      "credits.purchased",
			Timestamp: time.Now(),
			Payload: map[string]interface{}{
				"user_id":     u.ID,
				"amount":      req.Amount,
				"description": tx.Description,
				"balance":     tx.Amount,
			},
		})
	}
}

func (h *Handler) GetBudget(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	credits, err := h.creditSvc.GetBalance(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]interface{}{
		"daily_budget":   credits.DailyBudget,
		"monthly_budget": credits.MonthlyBudget,
		"daily_spent":    credits.DailySpent,
		"monthly_spent":  credits.MonthlySpent,
	})
}

func (h *Handler) SetBudget(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		DailyBudget   *int `json:"daily_budget"`
		MonthlyBudget *int `json:"monthly_budget"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if err := h.creditSvc.SetBudget(r.Context(), u.ID, req.DailyBudget, req.MonthlyBudget); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

// Transactions
func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	txs, total, err := h.creditSvc.ListTransactions(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Paginated(w, txs, total, page, limit)
}

// Logs
func (h *Handler) ListLogs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	logs, total, err := h.logSvc.ListLogs(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Paginated(w, logs, total, page, limit)
}

// Analytics
func (h *Handler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	data, err := h.analyticsSvc.UserAnalytics(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, data)
}

// Models
func (h *Handler) ListModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.providerSvc.ListModels(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, models)
}

// Chat Proxy
func (h *Handler) ChatProxy(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	var req domain.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if vErr := req.Validate(); vErr != nil {
		response.JSON(w, vErr.Status, response.Body{Success: false, Error: vErr.Message})
		return
	}

	if req.Model == "" {
		req.Model = h.providerSvc.DefaultModel()
	}

	// Content moderation
	if h.moderator != nil {
		for _, m := range req.Messages {
			if m.Content == "" {
				continue
			}
			modResult, modErr := h.moderator.Moderate(r.Context(), m.Content)
			if modErr == nil && modResult != nil && modResult.Flagged {
				logger.Warn("content_moderation_flagged", "user_id", u.ID, "categories", modResult.Categories, "score", modResult.Score)
				response.Error(w, 400, "Content flagged by moderation policy")
				return
			}
		}
	}

	// API key scoping: max tokens per request
	if apiKey := middleware.GetAPIKey(r); apiKey != nil && apiKey.MaxTokensPerRequest > 0 {
		estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, req.Messages)
		estimatedTokens := estInput + estOutput
		if estimatedTokens > apiKey.MaxTokensPerRequest {
			response.Error(w, 429, "estimated tokens exceed max allowed per request for this API key")
			return
		}
	}

	// Estimate cost for pre-check
	estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, req.Messages)
	estimatedCost := (estInput + estOutput) * 2 // rough cost multiplier
	if estimatedCost < 100 {
		estimatedCost = 100
	}

	if err := h.creditSvc.CheckBalance(r.Context(), u.ID, estimatedCost); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}

	// Distributed tracing span
	span := middleware.StartSpan(r.Context(), "chat_proxy")
	span.SetTag("user_id", u.ID)
	span.SetTag("model", req.Model)
	defer span.Finish()

	// Always stream for now to match existing behavior
	ch, err := h.providerSvc.ChatStream(r.Context(), req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	var outputTokens int
	var outputBuf strings.Builder
	flusher, ok := w.(http.Flusher)

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
				data, _ := json.Marshal(map[string]interface{}{
					"choices": []map[string]interface{}{{
						"delta": map[string]string{"content": chunk.Delta.Content},
					}},
				})
				fmt.Fprintf(w, "data: %s\n\n", string(data))
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
	inputTokens := llm.EstimateTokens(outputBuf.String()) // rough estimate for input
	if inputTokens == 0 {
		inputTokens = len(req.Messages) * 50
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}
	cost := (inputTokens + outputTokens) * 2
	if cost < 100 {
		cost = 100
	}
	latency := 0

	// Async logging
	apiKeyID := ""
	if k := middleware.GetAPIKey(r); k != nil {
		apiKeyID = k.ID
	}
	var akID *string
	if apiKeyID != "" {
		akID = &apiKeyID
	}
	userID := u.ID
	model := req.Model

	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("async_billing_panic", "recover", r, "user_id", userID)
			}
		}()
		ctx := context.Background()
		_, logErr := h.creditSvc.LogAndDeduct(ctx, userID, akID, model, inputTokens, outputTokens, cost, latency)
		if logErr != nil {
			logger.Error("post_chat_billing_failed", "error", logErr.Error(), "user_id", userID)
		}
		if h.webhookSvc != nil {
			h.webhookSvc.Dispatch(ctx, userID, webhook.Event{
				Type:      "request.completed",
				Timestamp: time.Now(),
				Payload: map[string]interface{}{
					"user_id":       userID,
					"model":         model,
					"input_tokens":  inputTokens,
					"output_tokens": outputTokens,
					"cost":          cost,
					"api_key_id":    apiKeyID,
				},
			})
		}
	}()
}

// Admin
func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	users, total, err := h.userSvc.List(r.Context(), page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Paginated(w, users, total, page, limit)
}

func (h *Handler) AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" { id = r.URL.Query().Get("id") }
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.userSvc.Delete(r.Context(), id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.analyticsSvc.PlatformStats(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, stats)
}

// ProviderHealth returns health status for all configured providers.
func (h *Handler) ProviderHealth(w http.ResponseWriter, r *http.Request) {
	statuses := h.providerSvc.ProviderHealthStatuses()
	if statuses == nil {
		providers := h.providerSvc.ListProviderNames(r.Context())
		result := make([]map[string]interface{}, 0, len(providers))
		for _, name := range providers {
			result = append(result, map[string]interface{}{
				"provider": name,
				"status":   "unknown",
			})
		}
		response.OK(w, result)
		return
	}

	result := make([]map[string]interface{}, 0, len(statuses))
	for _, s := range statuses {
		item := map[string]interface{}{
			"provider":     s.Provider,
			"status":       s.Status.String(),
			"last_checked": s.LastChecked,
			"latency_ms":   s.Latency.Milliseconds(),
		}
		if s.LastError != nil {
			// Sanitize error to avoid leaking sensitive details like API keys or URLs
			errStr := s.LastError.Error()
			// Simple redaction: if error contains URLs or key-like strings, replace with generic message
			if strings.Contains(errStr, "http") || strings.Contains(errStr, "sk-") || strings.Contains(errStr, "nvapi-") || strings.Contains(errStr, "key") {
				errStr = "provider request failed"
			}
			item["last_error"] = errStr
		}
		result = append(result, item)
	}
	response.OK(w, result)
}

// AdminCircuitBreakers returns circuit breaker states for all proxy providers.
func (h *Handler) AdminCircuitBreakers(w http.ResponseWriter, r *http.Request) {
	if h.llmRegistry == nil {
		response.OK(w, []map[string]interface{}{})
		return
	}

	var result []map[string]interface{}
	for _, name := range h.llmRegistry.Providers() {
		p, ok := h.llmRegistry.Get(name)
		if !ok {
			continue
		}
		item := map[string]interface{}{
			"provider": name,
			"state":    "unknown",
		}
		if cb, ok := p.(*circuitbreaker.CircuitBreaker); ok {
			item["state"] = cb.State().String()
		}
		result = append(result, item)
	}
	response.OK(w, result)
}
