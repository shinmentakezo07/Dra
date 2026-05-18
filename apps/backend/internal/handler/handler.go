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
	"dra-platform/backend/pkg/llm/moderation"
	"dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/webhook"
	"dra-platform/backend/pkg/email"

	"golang.org/x/sync/errgroup"

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
	conversationSvc   *service.ConversationService
	promptSvc         *service.PromptService
	fileSvc           *service.FileService
	adminSvc          *service.AdminService
	adminSessionRepo  *repository.AdminSessionRepo
	rbacSvc           *service.RBACService
	rateLimitSvc      *service.RateLimitService
	budgetSvc         *service.BudgetService
	comparisonSvc     *service.ComparisonService
	fineTuningSvc     *service.FineTuningService
	providerPluginSvc *service.ProviderPluginService
	exportSvc         *service.ExportService
	tokenBlacklistRepo *repository.TokenBlacklistRepo
	moderator       moderation.Moderator
	notificationHub *NotificationHub
	modelRouter     *router.Router
	budgetRouter    *router.BudgetRouter
	llmCache        cache.Cache
	abRouter        *router.ABRouter
	emailSender     email.Sender
	stripeSvc       *service.StripeService
}

func New(cfg *config.Config, database *db.DB, u *service.UserService, k *service.APIKeyService, c *service.CreditService, a *service.AnalyticsService, l *service.LogService, p *service.ProviderService, w *service.WebhookService, b *service.BatchService, o *service.OrganizationService) *Handler {
	return &Handler{
		cfg: cfg, db: database, userSvc: u, keySvc: k, creditSvc: c, analyticsSvc: a,
		logSvc: l, providerSvc: p, webhookSvc: w, batchSvc: b, orgSvc: o,
		conversationSvc:   service.NewConversationService(repository.NewConversationRepo(database)),
		promptSvc:         service.NewPromptService(repository.NewPromptRepo(database)),
		fileSvc:           service.NewFileService(repository.NewFileRepo(database)),
		rbacSvc:           service.NewRBACService(repository.NewRBACRepo(database)),
		rateLimitSvc:      service.NewRateLimitService(repository.NewRateLimitRepo(database)),
		budgetSvc:         service.NewBudgetService(repository.NewBudgetRepo(database)),
		comparisonSvc:     service.NewComparisonService(repository.NewComparisonRepo(database)),
		fineTuningSvc:     service.NewFineTuningService(repository.NewFineTuningRepo(database)),
		providerPluginSvc: service.NewProviderPluginService(repository.NewProviderPluginRepo(database)),
		exportSvc:         service.NewExportService(repository.NewExportRepo(database), repository.NewLogRepo(database)),
		tokenBlacklistRepo: repository.NewTokenBlacklistRepo(database),
		moderator:         moderation.NewLocalModerator(),
		notificationHub:   NewNotificationHub(),
	}
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

func (h *Handler) SetFineTuningService(s *service.FineTuningService) {
	h.fineTuningSvc = s
}

// SetABRouter sets the A/B test router.
func (h *Handler) SetABRouter(ab *router.ABRouter) {
	h.abRouter = ab
}

// SetLLMCache sets the LLM response cache.
func (h *Handler) SetLLMCache(c cache.Cache) {
	h.llmCache = c
}

// SetAdminService sets the admin service for admin panel endpoints.
func (h *Handler) SetAdminService(s *service.AdminService) {
	h.adminSvc = s
}

func (h *Handler) SetAdminSessionRepo(r *repository.AdminSessionRepo) {
	h.adminSessionRepo = r
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

func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
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
	if auth == nil || auth.User.ID == "" || !auth.User.IsAdmin() {
		response.Error(w, 403, "Admin access required")
		return
	}
	// Create admin session record for audit
	if h.adminSessionRepo != nil {
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.RemoteAddr
		}
		_, _ = h.adminSessionRepo.Create(r.Context(), auth.User.ID, "", ip, r.UserAgent(), time.Now().Add(24*time.Hour))
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

	eg, ctx := errgroup.WithContext(context.Background())
	eg.Go(func() error {
		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		if _, logErr := h.creditSvc.LogAndDeduct(ctx, userID, akID, model, inputTokens, outputTokens, cost, latency); logErr != nil {
			logger.Error("post_chat_billing_failed", "error", logErr.Error(), "user_id", userID)
		}
		return nil
	})
	eg.Go(func() error {
		if h.webhookSvc == nil {
			return nil
		}
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
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
		return nil
	})
	go eg.Wait()
}

// Admin
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
	response.OK(w, h.providerSvc.CircuitBreakerStatuses())
}

func (h *Handler) MyPermissions(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	perms, err := h.rbacSvc.GetUserPermissions(r.Context(), u.ID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, perms)
}

func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.rbacSvc.ListRoles(r.Context())
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, roles)
}

func (h *Handler) GetRolePermissions(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	perms, err := h.rbacSvc.GetRolePermissions(r.Context(), role)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, perms)
}

func (h *Handler) AddRolePermission(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	var req struct { PermissionName string `json:"permissionName"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if req.PermissionName == "" { response.Error(w, 400, "permissionName is required"); return }
	if err := h.rbacSvc.AddRolePermission(r.Context(), role, req.PermissionName); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"added": true})
}

func (h *Handler) RemoveRolePermission(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	permName := chi.URLParam(r, "permission")
	if err := h.rbacSvc.RemoveRolePermission(r.Context(), role, permName); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"removed": true})
}

func (h *Handler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var req struct { Role string `json:"role"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if req.Role == "" { response.Error(w, 400, "role is required"); return }
	if err := h.rbacSvc.UpdateUserRole(r.Context(), userID, req.Role); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.rbacSvc.ListPermissions(r.Context())
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, perms)
}

func (h *Handler) ListTiers(w http.ResponseWriter, r *http.Request) {
	tiers, err := h.rateLimitSvc.ListTiers(r.Context())
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, tiers)
}

func (h *Handler) UpdateTierLimits(w http.ResponseWriter, r *http.Request) {
	tier := chi.URLParam(r, "tier")
	var req struct { RPM, Daily, Monthly, MaxTokens int }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if err := h.rateLimitSvc.UpdateTierLimits(r.Context(), tier, req.RPM, req.Daily, req.Monthly, req.MaxTokens); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) SetUserTier(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var req struct { Tier string `json:"tier"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if req.Tier == "" { response.Error(w, 400, "tier is required"); return }
	if err := h.rateLimitSvc.SetUserTier(r.Context(), userID, req.Tier); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) CreateBudgetAlert(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateBudgetAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	alert, err := h.budgetSvc.CreateAlert(r.Context(), u.ID, req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, alert)
}

func (h *Handler) ListBudgetAlerts(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	alerts, err := h.budgetSvc.GetUserAlerts(r.Context(), u.ID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, alerts)
}

func (h *Handler) DeleteBudgetAlert(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	if err := h.budgetSvc.DeleteAlert(r.Context(), u.ID, id); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) CreateBudgetCap(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateBudgetCapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	cap, err := h.budgetSvc.CreateCap(r.Context(), u.ID, req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, cap)
}

func (h *Handler) GetBudgetCap(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	cap, err := h.budgetSvc.GetUserCap(r.Context(), u.ID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, cap)
}

func (h *Handler) UpdateBudgetCap(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateBudgetCapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if err := h.budgetSvc.UpdateCap(r.Context(), u.ID, req); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) DeleteBudgetCap(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	if err := h.budgetSvc.DeleteCap(r.Context(), u.ID); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) CreateComparison(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateABComparisonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	c, err := h.comparisonSvc.Create(r.Context(), u.ID, req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, c)
}

func (h *Handler) GetComparison(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	c, err := h.comparisonSvc.GetByID(r.Context(), u.ID, id)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, c)
}

func (h *Handler) ListComparisons(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	page, limit := parsePagination(r)
	items, err := h.comparisonSvc.ListByUser(r.Context(), u.ID, page, limit)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, items)
}

func (h *Handler) DeleteComparison(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	if err := h.comparisonSvc.Delete(r.Context(), u.ID, id); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) CreateFineTuningJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateFineTuningJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	j, err := h.fineTuningSvc.CreateJob(r.Context(), u.ID, req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, j)
}

func (h *Handler) GetFineTuningJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "jobId")
	j, err := h.fineTuningSvc.GetJob(r.Context(), u.ID, id)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, j)
}

func (h *Handler) ListFineTuningJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	page, limit := parsePagination(r)
	jobs, err := h.fineTuningSvc.ListJobs(r.Context(), u.ID, page, limit)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, jobs)
}

func (h *Handler) CreateProviderPlugin(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateProviderPluginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	p, err := h.providerPluginSvc.Create(r.Context(), "", req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, p)
}

func (h *Handler) ListProviderPlugins(w http.ResponseWriter, r *http.Request) {
	plugins, err := h.providerPluginSvc.List(r.Context())
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, plugins)
}

func (h *Handler) GetProviderPlugin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.providerPluginSvc.GetByID(r.Context(), id)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, p)
}

func (h *Handler) ToggleProviderPlugin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct { Active bool `json:"active"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	if err := h.providerPluginSvc.Toggle(r.Context(), id, req.Active); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) DeleteProviderPlugin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.providerPluginSvc.Delete(r.Context(), id); err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) CreateExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req domain.CreateExportJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { response.Error(w, 400, "Invalid JSON body"); return }
	job, err := h.exportSvc.CreateJob(r.Context(), u.ID, req)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, job)
}

func (h *Handler) GetExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	job, err := h.exportSvc.GetJob(r.Context(), u.ID, id)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, job)
}

func (h *Handler) ListExportJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	page, limit := parsePagination(r)
	jobs, err := h.exportSvc.ListJobs(r.Context(), u.ID, page, limit)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, jobs)
}

func (h *Handler) DownloadExportJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	job, err := h.exportSvc.GetJob(r.Context(), u.ID, id)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	if job.Status != "completed" || job.FilePath == nil {
		response.Error(w, 400, "Export not ready")
		return
	}
	http.ServeFile(w, r, *job.FilePath)
}

func (h *Handler) ListBatchJobs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	jobs, err := h.batchSvc.List(r.Context(), u.ID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, jobs)
}

func (h *Handler) CancelBatchJob(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	if err := h.batchSvc.Cancel(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"cancelled": true})
}

func (h *Handler) GetWebhookDeliveries(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	webhookID := chi.URLParam(r, "id")
	deliveries, err := h.webhookSvc.ListDeliveries(r.Context(), u.ID, webhookID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, deliveries)
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	if err := h.userSvc.Delete(r.Context(), u.ID); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// Extract token from request
	tokenStr := ""
	if auth := r.Header.Get("Authorization"); auth != "" && len(auth) > 7 && auth[:7] == "Bearer " {
		tokenStr = auth[7:]
	}
	if tokenStr == "" {
		for _, name := range []string{"authjs.session-token", "__Secure-authjs.session-token", "next-auth.session-token", "__Secure-next-auth.session-token"} {
			if c, err := r.Cookie(name); err == nil {
				tokenStr = c.Value
				break
			}
		}
	}

	if tokenStr != "" {
		u := middleware.GetUser(r)
		userID := ""
		if u != nil {
			userID = u.ID
		}
		// Blacklist token with 24h expiry (typical JWT lifetime)
		if err := h.tokenBlacklistRepo.Blacklist(r.Context(), tokenStr, userID, time.Now().Add(24*time.Hour)); err != nil {
			logger.Warn("logout_blacklist_failed", "error", err.Error())
		}
	}

	// Clear session cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "authjs.session-token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "__Secure-authjs.session-token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	response.OK(w, map[string]bool{"logged_out": true})
}

func (h *Handler) UpdateKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	var req struct {
		Name                *string  `json:"name,omitempty"`
		AllowedModels       []string `json:"allowedModels,omitempty"`
		AllowedIPs          []string `json:"allowedIPs,omitempty"`
		MaxTokensPerRequest *int     `json:"maxTokensPerRequest,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body"); return
	}
	if err := h.keySvc.Update(r.Context(), u.ID, id, req.Name, req.AllowedModels, req.AllowedIPs, req.MaxTokensPerRequest); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) CreateFineTuningDataset(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	var req struct {
		Filename string `json:"filename"`
		Format   string `json:"format"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body"); return
	}
	if req.Filename == "" || req.Format == "" {
		response.Error(w, 400, "filename and format are required"); return
	}
	ds, err := h.fineTuningSvc.CreateDataset(r.Context(), u.ID, req.Filename, req.Format)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.Created(w, ds)
}

func (h *Handler) ListFineTuningDatasets(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	datasets, err := h.fineTuningSvc.ListDatasets(r.Context(), u.ID)
	if err != nil { response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return }
	response.OK(w, datasets)
}

func (h *Handler) DeleteFineTuningDataset(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil { response.Error(w, 401, "Authentication required"); return }
	id := chi.URLParam(r, "id")
	if err := h.fineTuningSvc.DeleteDataset(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message}); return
	}
	response.OK(w, map[string]bool{"deleted": true})
}
